import { create } from '@stylable/runtime';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { StylableDOMUtil } from '../src';

describe('stylable-dom-utils', () => {

    // tslint:disable-next-line: max-line-length
    const s = create('ns', { classes: {root: 'ns-root', x: 'ns__x', y: 'ns__y'}, keyframes: {}, vars: {}, stVars: {} }, '', 0, '0', null);

    const util = new StylableDOMUtil(s);

    it('scopeSelector defaults to root', () => {
        expect(util.scopeSelector()).to.equal(`.ns-root`);
    });

    it('scopeSelector local class', () => {
        expect(util.scopeSelector('.x')).to.equal(`.ns__x`);
    });

    it('scopeSelector handle multiple local classes', () => {
        expect(util.scopeSelector('.x .y')).to.equal(`.ns__x .ns__y`);
    });

    it('scopeSelector Error("pseudo-element")', () => {
        expect(() => util.scopeSelector('.x::y')).to.throw('selector with pseudo-element is not supported yet.');
    });

    it('scopeSelector Error("element")', () => {
        expect(() => util.scopeSelector('x')).to.throw('selector with element is not supported yet.');
    });

    it('scopeSelector handle local states', () => {
        expect(util.scopeSelector('.x:loading')).to.equal(`.ns__x.ns--loading`);
    });

    it('scopeSelector handles local state with a paramter', () => {
        expect(util.scopeSelector('.x:loading(done)')).to.equal(`.ns__x.ns---loading-4-done`);
    });

    it('scopeSelector handle class local states (multiple)', () => {
        expect(
            util.scopeSelector('.x:loading:thinking')
        ).to.equal(`.ns__x.ns--loading.ns--thinking`);
    });

    describe('Style state', () => {
        const { window } = new JSDOM(`<div id="container"></div>`);

        it('hasStyleState returns true if the requested style state exists', () => {
            const document = window.document;
            const elem = document.createElement('a');
            elem.classList.add(s.cssStates({ loading: true }));

            expect(util.hasStyleState(elem, 'loading')).to.equal(true);
        });

        it('getStyleState returns the requested boolean style state value', () => {
            const document = window.document;
            const elem = document.createElement('a');
            elem.classList.add(s.cssStates({ loading: true }));

            expect(util.getStyleState(elem, 'loading')).to.equal(true);
        });

        it('getStyleState returns the requested string style state value', () => {
            const document = window.document;
            const elem = document.createElement('a');
            elem.classList.add(s.cssStates({ loading: 'value' }));

            expect(util.getStyleState(elem, 'loading')).to.equal('value');
        });
    });

});
