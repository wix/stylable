import * as chai from 'chai';
import * as sinon from 'sinon';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const NO_TESTS_GRACE = 20;
const DEFAULT_TIMEOUT = 2 * 1000;
const _expect: sinon.SinonSpy & typeof chai.expect = sinon.spy(chai.expect) as any;
const assert = ((chai as any).Assertion.prototype.assert = sinon.spy(
    (chai as any).Assertion.prototype.assert
));

function assertNoError() {
    // sometimes (like when running inside expect()) the last array element is undefined
    const exceptions = assert.exceptions.filter(Boolean);
    assert.resetHistory();
    if (exceptions.length) {
        throw exceptions.pop();
    }
}
assertNoError.forget = function forget() {
    assert.resetHistory();
};

export function plan(
    count: number,
    testCase: () => void | Promise<any>,
    timeout = DEFAULT_TIMEOUT
) {
    return async function(this: Mocha.ITestCallbackContext) {
        _expect.resetHistory();
        if (this) {
            this.timeout(timeout * 1000);
        } else {
            console.warn('plan should execute in mocha context');
        }
        const start = Date.now();
        const waitForCount = (async () => {
            while (_expect.callCount < count) {
                assertNoError();
                if (Date.now() - start > timeout - NO_TESTS_GRACE) {
                    throw new Error(`only ${_expect.callCount} tests done out of ${count} planned`);
                }
                await sleep(10);
            }
            assertNoError();
        })();
        await Promise.all([testCase.apply(this), waitForCount]);
        if (_expect.callCount > count) {
            throw new Error(`${_expect.callCount} tests done but only ${count} planned`);
        }
        await sleep(NO_TESTS_GRACE);
        if (_expect.callCount > count) {
            throw new Error(`${_expect.callCount} tests done but only ${count} planned`);
        }
        assertNoError();
    };
}

export const expect: typeof chai.expect = _expect;

export function obj(seed: any) {
    return { foo: seed } as any;
}

describe('chai testkit', () => {
    beforeEach(() => {
        assert.resetHistory();
    });
    describe('plan', () => {
        it('runs the test (and succeeds when 0 assertions as planned)', async function() {
            let executed = false;
            const thePlan = plan(0, () => {
                executed = true;
            }).bind(this);
            await thePlan();
            await expect(executed).to.equal(true);
        });
        it(
            'succeeds when 1 assertion as planned',
            plan(1, () => {
                expect(3).to.equal(3);
            })
        );
        it(
            'waits for assertion and succeeds even if assertion is after promise',
            plan(1, () => {
                // this will execute after the plan finishes
                setTimeout(() => expect(3).to.equal(3), DEFAULT_TIMEOUT / 2);
            })
        );
        it('fails when too many assertions', async function() {
            const thePlan = plan(0, () => {
                expect(3).to.equal(3); // the plan was for 0 tests, this should fail
            }).bind(this);
            const thrown = await thePlan().catch((e: Error) => e);
            expect(thrown).to.be.instanceof(Error);
            expect((thrown as Error).message).to.equal('1 tests done but only 0 planned');
        });
        it('fails when too few assertions', async function() {
            const thePlan = plan(
                1,
                () => {
                    /**/
                },
                10
            ).bind(this);
            const thrown = await thePlan().catch((e: Error) => e);
            expect(thrown).to.be.instanceof(Error);
            expect((thrown as Error).message).to.equal('only 0 tests done out of 1 planned');
        });
        it('waits for too many assertions and fails even if assertion is after promise', async function() {
            const thePlan = plan(
                0,
                () => {
                    // this will execute after the plan finishes
                    setTimeout(() => expect(3).to.equal(3), NO_TESTS_GRACE / 2);
                },
                10
            ).bind(this);
            const thrown = await thePlan().catch((e: Error) => e);
            expect(thrown).to.be.instanceof(Error);
            expect((thrown as Error).message).to.equal('1 tests done but only 0 planned');
        });
        it('throws original error if assertion failed', async function() {
            const error = new Error('foo');
            const thePlan = plan(0, () => {
                throw error;
            }).bind(this);
            const thrown = await thePlan().catch((e: Error) => e);
            expect(thrown).to.equal(error);
        });
        it('assertion error has priority over plan error', async function() {
            const error = new Error('foo');
            const thePlan = plan(0, () => {
                expect(3).to.equal(3); // the plan was for 0 tests, this should fail
                throw error;
            }).bind(this);
            const thrown = await thePlan().catch((e: Error) => e);
            expect(thrown).to.equal(error);
        });
    });
    describe('assertNoError', () => {
        it('does not throw when no assertion made', () => {
            expect(assertNoError).to.not.throw();
        });
        it('does not throw when no assertion error', () => {
            expect(3).to.equal(3);
            expect(assertNoError).to.not.throw();
        });
        it('throws original error when exists', () => {
            try {
                expect(3).equal(4);
            } catch {
                /**/
            }
            expect(assertNoError).to.throw(chai.AssertionError, 'expected 3 to equal 4');
        });
        it('does not throw after cleanup (forgets)', () => {
            try {
                expect(3).equal(4);
            } catch {
                /**/
            }
            assertNoError.forget();
            expect(assertNoError).to.not.throw();
        });
        it('does not throw on second assertion (forgets on assertion)', () => {
            try {
                expect(3).equal(4);
            } catch {
                /**/
            }
            try {
                assertNoError();
            } catch {
                /**/
            }
            expect(assertNoError).to.not.throw();
        });
    });
});
