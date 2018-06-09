/* tslint:disable:max-line-length */
import { expect } from 'chai';
import * as postcss from 'postcss';
import {
    generateFromMock,
    generateStylableRoot,
    matchAllRulesAndDeclarations,
    matchRuleAndDeclaration
} from '../utils/test-utils';

describe('Mixin diagnostics', () => {
    it('should not report missing function on -st-mixin directive', () => {
        const result = generateFromMock({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./imported.st.css";
                            -st-named: y;
                        }

                        .x {
                            -st-mixin: y(color1 green, color2 yellow);
                        }
                    `
                }
            }
        });

        expect(result.meta.transformDiagnostics!.reports.length).to.equal(0);
    });
});
