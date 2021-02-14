import { expect } from 'chai';
import sinon from 'sinon';
import { timedCache } from '@stylable/core';

const sleep = (time: number) => new Promise((res) => setTimeout(res, time));

describe('timed-cache', () => {
    it('should cache for specific time', async () => {
        const spy = sinon.spy((...args: string[]) => args.join(';'));
        const cached = timedCache(spy, {
            createKey: (args: string[]) => args.join(';'),
            timeout: 100,
            useTimer: false,
        });

        cached.get('1');
        cached.get('2');
        cached.get('3');

        cached.get('1');
        cached.get('2');
        cached.get('3');

        cached.get('1');
        cached.get('2');
        cached.get('3');

        expect(spy.callCount, 'calls').to.equal(3);
        expect(cached.cache.size, 'cache size').to.equal(3);
        await sleep(101);

        cached.get('1');
        expect(cached.cache.size, 'cache size after clean up').to.equal(1);
    });

    it('should cache for specific time with timer auto clean', async () => {
        const spy = sinon.spy((...args: string[]) => args.join(';'));
        const cached = timedCache(spy, {
            createKey: (args: string[]) => args.join(';'),
            timeout: 100,
            useTimer: true,
        });

        cached.get('1');
        cached.get('2');
        cached.get('3');

        cached.get('1');
        cached.get('2');
        cached.get('3');

        cached.get('1');
        cached.get('2');
        cached.get('3');

        expect(spy.callCount, 'calls').to.equal(3);
        expect(cached.cache.size, 'cache size').to.equal(3);
        await sleep(101);

        expect(cached.cache.size, 'cache size after clean up').to.equal(0);
    });

    it('should cache for specific time with timer auto clean (everytime)', async () => {
        const spy = sinon.spy((...args: string[]) => args.join(';'));
        const cached = timedCache(spy, {
            createKey: (args: string[]) => args.join(';'),
            timeout: 100,
            useTimer: true,
        });

        cached.get('1');
        cached.get('2');
        cached.get('3');

        cached.get('1');
        cached.get('2');
        cached.get('3');

        cached.get('1');
        cached.get('2');
        cached.get('3');

        expect(spy.callCount, 'calls').to.equal(3);
        expect(cached.cache.size, 'cache size').to.equal(3);
        await sleep(101);

        expect(cached.cache.size, 'cache size after clean up').to.equal(0);
        cached.get('1');
        cached.get('2');
        cached.get('3');
        await sleep(101);
        expect(cached.cache.size, 'cache size after clean up').to.equal(0);
    });
});
