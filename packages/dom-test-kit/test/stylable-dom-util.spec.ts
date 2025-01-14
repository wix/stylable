import { StylableDOMUtil, PartialElement } from '@stylable/dom-test-kit';
import { DTSKit } from '@stylable/e2e-test-kit';
import { MinimalDocument } from '@stylable/core-test-kit';
import { expect } from 'chai';
import { contractTest } from './contract-test.js';

const minDoc = new MinimalDocument();

describe(
    'stylable-dom-utils',
    contractTest(StylableDOMUtil, {
        scopeSelectorTest: true,
        createElement: () => minDoc.createElement('div') as unknown as PartialElement,
    }),
);

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
            false,
        );
        tk.linkNodeModules();

        expect(tk.typecheck('test.ts')).to.include(
            "Argument of type 'unknown' is not assignable to parameter of type 'StylesheetHost'",
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
