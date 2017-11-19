import { expect } from 'chai';
import { create } from '../src/runtime';

describe('runtime', () => {

    it('should expose locals on top level style', () => {

        const runtime = create('root', 'namespace', { local: 'namespace--local' }, null, '0');

        expect(runtime.$get('local')).to.equal('namespace--local');
        expect(runtime.local).to.equal('namespace--local');

    });

    it('should expose cssStates helper', () => {

        const runtime = create('root', 'namespace', { local: 'namespace--local' }, null, '0');

        expect(runtime.$cssStates({ state: true, otherstate: false })).to.eql({
            [`data-${runtime.$stylesheet.namespace}-${'state'}`]: true
        });

    });

    it('should expose root function to apply stylable on components', () => {

        const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

        expect(typeof runtime, 'typeof runtime').to.equal('function');

    });

    it('should map a className string to local classes', () => {

        const runtime = create('root', 'namespace', { root: 'namespace--root', local: 'namespace--local' }, null, '0');

        expect(runtime.$mapClasses('root local global')).to.equal('namespace--root namespace--local global');

    });

    describe('root apply', () => {
        it('should not add root className when props are not provided', () => {

            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

            expect(runtime('')).to.eql({});

        });
        it('should add root className only when props are provided', () => {

            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

            expect(runtime('', undefined, {})).to.eql({
                className: 'namespace--root'
            });

        });

        it('should add global className', () => {
            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            expect(runtime('global-class')).to.eql({
                className: 'global-class'
            });
        });

        it('should add states mapping', () => {

            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

            expect(runtime('', { on: true })).to.eql({
                [`data-${runtime.$stylesheet.namespace}-${'on'}`]: true
            });

        });

        it('should auto add root when props are provided', () => {

            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');
            const props = {};
            expect(runtime('', null, props)).to.eql({
                className: 'namespace--root'
            });

        });

        it('should auto copy className from props', () => {

            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

            const props = { className: 'class-from-props' };
            expect(runtime('', {}, props)).to.eql({
                className: 'namespace--root class-from-props'
            });

        });

        it('should copy data- props ', () => {

            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

            expect(runtime('', {}, { 'data-prop': true })).to.eql({
                'className': 'namespace--root',
                'data-prop': true
            });

        });

        it('should map classes and add className from props ', () => {

            const runtime = create('root', 'namespace', {
                root: 'namespace--root',
                local: 'namespace--local'
            }, null, '0');

            const props = runtime('local global', null, { className: 'class-from-props' });

            expect(props.className).to.eql('namespace--root namespace--local global class-from-props');

        });

    });

});
