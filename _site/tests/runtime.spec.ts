import { expect } from 'chai';
import { create } from '../src/runtime';

describe('runtime', () => {

    it('should expose locals on top level style', () => {
        const runtime = create('root', 'namespace', { local: 'namespace--local' }, null, '0');

        expect(runtime.local).to.equal('namespace--local');
        expect(runtime.$get('local'), 'private internal usage').to.equal('namespace--local');
    });

    it('should expose cssStates helper', () => {
        const runtime = create('root', 'namespace', { local: 'namespace--local' }, null, '0');

        expect(runtime.$cssStates({ state: true, otherstate: false })).to.eql({
            [`data-${runtime.$stylesheet.namespace}-${'state'}`]: true
        });

        expect(runtime.$cssStates({ state: false, otherstate: false })).to.eql({});
    });

    describe('Generate Element Attributes', () => {

        it('should expose function api to apply stylable on components', () => {
            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            expect(typeof runtime, 'typeof runtime').to.equal('function');
        });

        it('should return empty object when called with empty string', () => {
            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            expect(runtime('')).to.eql({});
        });

        it('should map classNames to locals with fallback to global classes', () => {
            const locals = { root: 'namespace--root', local: 'namespace--local' };
            const runtime = create('root', 'namespace', locals, null, '0');
            expect(runtime('root local global')).to.eql({
                className: 'namespace--root namespace--local global'
            });
        });

        it('should add states mapping', () => {
            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            expect(runtime('', { on: true, off: false })).to.eql({
                [`data-${runtime.$stylesheet.namespace}-${'on'}`]: true
            });
        });

        it('should append className from props', () => {
            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            const props = { className: 'class-from-props' };
            expect(runtime('root', {}, props)).to.eql({
                className: 'namespace--root class-from-props'
            });
        });

        it('should copy data- props ', () => {
            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            expect(runtime('root', {}, { 'data-prop': true })).to.eql({
                'className': 'namespace--root',
                'data-prop': true
            });
        });

        it('should override states with data- props ', () => {

            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            const nsStateName = `data-${runtime.$stylesheet.namespace}-${'on'}`;

            expect(runtime('root', { a: false }, { [nsStateName]: true })).to.eql({
                className: 'namespace--root',
                [nsStateName]: true
            });
        });
    });

});
