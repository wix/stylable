import { StylableDOMUtil } from '@stylable/dom-test-kit';
import { DTSKit } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { contractTest, testStylesheet, createPartialElement } from './contract-test';

describe('stylable-dom-utils', () => {
    contractTest(new StylableDOMUtil(testStylesheet), testStylesheet, () => createPartialElement());
});

describe('stylable-dom-utils scopeSelectorContract', () => {
    const util = new StylableDOMUtil(testStylesheet);
    const scopeSelector = util.scopeSelector.bind(util);

    it('scopeSelector defaults to root', () => {
        expect(scopeSelector()).to.equal(`.ns-root`);
    });
    it('scopeSelector local class', () => {
        expect(scopeSelector('.x')).to.equal(`.ns__x`);
    });
    it('scopeSelector local class with compose', () => {
        expect(scopeSelector('.z')).to.equal(`.ns__z`);
    });
    it('scopeSelector handle multiple local classes', () => {
        expect(scopeSelector('.x .y')).to.equal(`.ns__x .ns__y`);
    });
    it('scopeSelector Error("pseudo-element")', () => {
        expect(() => scopeSelector('.x::y')).to.throw(
            'selector with pseudo-element is not supported yet.'
        );
    });
    it('scopeSelector Error("type")', () => {
        expect(() => scopeSelector('x')).to.throw('selector with type is not supported yet.');
    });
    it('scopeSelector handle local states', () => {
        expect(scopeSelector('.x:loading')).to.equal(`.ns__x.ns--loading`);
    });
    it('scopeSelector handles local state with a parameter', () => {
        expect(scopeSelector('.x:loading(done)')).to.equal(`.ns__x.ns---loading-4-done`);
    });
    it('scopeSelector handle class local states (multiple)', () => {
        expect(scopeSelector('.x:loading:thinking')).to.equal(`.ns__x.ns--loading.ns--thinking`);
    });
});

describe('stylable-dom-utils type compliance', function () {
    this.timeout(25000);
    let tk: DTSKit;

    beforeEach(() => {
        tk = new DTSKit();
    });

    afterEach(() => {
        tk.dispose();
    });

    it('should accept our global typing definition for the dom-test-kit', () => {
        tk.populate(
            {
                'test.st.css': '.root {}',
                'global.d.ts': `
                    declare module '*.st.css' {
                    export * from '@stylable/runtime/stylesheet';
                
                    const defaultExport: unknown;
                    export default defaultExport;
            }`,
                'test.ts': `
                    /// <reference path="./global.d.ts" />
                    import { StylableDOMUtil } from '@stylable/dom-test-kit';
                    import stylesheet from "./test.st.css";
    
                    const tk = new StylableDOMUtil(stylesheet);
            `,
            },
            false
        );
        tk.linkNodeModules();

        expect(tk.typecheck('test.ts')).to.include(
            "Argument of type 'unknown' is not assignable to parameter of type 'StylesheetHost'"
        );
    });

    it('should accept generated .d.ts typings for dom-test-kit creation', () => {
        tk.populate({
            'test.st.css': '.root {}',
            'test.ts': `
                import { StylableDOMUtil } from '@stylable/dom-test-kit';
                import * as stylesheet from "./test.st.css";
                
                const tk = new StylableDOMUtil(stylesheet);
                `,
        });
        tk.linkNodeModules();

        expect(tk.typecheck('test.ts', ['lib.dom.d.ts', 'lib.es2020.d.ts'])).to.equal('');
    });
});
