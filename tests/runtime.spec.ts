import { expect } from "chai";
import { create } from "../src/runtime";


describe('runtime', function () {

    it('should expose locals on top level style', function () {

        const runtime = create('root', 'namespace', { local: 'namespace--local' }, null, '0');

        expect(runtime.$get('local')).to.equal('namespace--local')
        expect(runtime.local).to.equal('namespace--local')


    });

    it('should expose cssStates helper', function () {

        const runtime = create('root', 'namespace', { local: 'namespace--local' }, null, '0');

        expect(runtime.$cssStates({ state: true, otherstate: false })).to.eql({
            [`data-${runtime.$stylesheet.namespace}-${'state'}`]: true
        })

    });

    it('should expose root function to apply stylable on components', function () {

        const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

        expect(typeof runtime, 'typeof runtime').to.equal('function');

    });

    describe('root apply', function () {

        it('should add root className', function () {

            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

            expect(runtime('')).to.eql({
                className: 'namespace--root'
            })

        });

        it('should add additional className', function () {

            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

            expect(runtime('additional-class')).to.eql({
                className: 'namespace--root additional-class'
            })

        });

        it('should add states mapping', function () {

            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

            expect(runtime('additional-class', {on: true})).to.eql({
                className: 'namespace--root additional-class',
                [`data-${runtime.$stylesheet.namespace}-${'on'}`]: true
            })

        });

        it('should auto copy className from props', function () {
            
            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

            expect(runtime('', {}, {className: 'from-props'})).to.eql({
                className: 'namespace--root from-props'               
            })

        });

        it('should copy data- props ', function () {
            
            const runtime = create('root', 'namespace', { root: 'namespace--root' }, null, '0');

            expect(runtime('', {}, {"data-prop": true})).to.eql({
                className: 'namespace--root',
                "data-prop": true
            })

        });

    })

});

