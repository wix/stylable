import { expect } from 'chai';
import { create } from '../../src/runtime';
import { StylableDOMUtil } from './stylable-dom-util';

describe('stylable-dom-utils', () => {

    const s = create('root', 'ns', { root: 'ns-root', x: 'ns--x', y: 'ns--y' }, null, '0');

    const util = new StylableDOMUtil(s);

    it('scopeSelector defaults to root', () => {
        expect(util.scopeSelector()).to.equal(`.ns-root`);
    });

    it('scopeSelector local class', () => {
        expect(util.scopeSelector('.x')).to.equal(`.ns--x`);
    });

    it('scopeSelector handle multiple local classes', () => {
        expect(util.scopeSelector('.x .y')).to.equal(`.ns--x .ns--y`);
    });

    it('scopeSelector Error("pseudo-element")', () => {
        expect(() => util.scopeSelector('.x::y')).to.throw('selector with pseudo-element is not supported yet.');
    });

    it('scopeSelector Error("element")', () => {
        expect(() => util.scopeSelector('x')).to.throw('selector with element is not supported yet.');
    });

    it('scopeSelector handle local states', () => {
        expect(util.scopeSelector('.x:loading')).to.equal(`.ns--x[data-ns-loading="true"]`);
    });

    it('scopeSelector handle class local states (multiple)', () => {
        expect(
            util.scopeSelector('.x:loading:thinking')
        ).to.equal(`.ns--x[data-ns-loading="true"][data-ns-thinking="true"]`);
    });

});
