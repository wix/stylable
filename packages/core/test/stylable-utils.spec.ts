import { generateInfra } from '@stylable/core-test-kit';
import { expect } from 'chai';
import { scopeCSSVar, generateScopedCSSVar } from '@stylable/core';

describe('stylable utils', () => {
    it('scopeCSSVar', () => {
        const { resolver, fileProcessor } = generateInfra({
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                            @st-global-custom-property --local-global;

                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: --imported, --imported-global;
                            }

                            .root {
                                --local: ;
                            }

                        `,
                },
                '/imported.st.css': {
                    namespace: 'imported',
                    content: `
                            @st-global-custom-property --imported-global;

                            .root {
                                --imported: ;
                            }
                        
                        `,
                },
            },
        });

        const entryMeta = fileProcessor.process('/entry.st.css');

        expect(scopeCSSVar(resolver, entryMeta, '--unknown')).to.equal(
            generateScopedCSSVar('entry', 'unknown')
        );

        expect(scopeCSSVar(resolver, entryMeta, '--local')).to.equal(
            generateScopedCSSVar('entry', 'local')
        );

        expect(scopeCSSVar(resolver, entryMeta, '--imported')).to.equal(
            generateScopedCSSVar('imported', 'imported')
        );

        expect(scopeCSSVar(resolver, entryMeta, '--imported-global')).to.equal('--imported-global');
        expect(scopeCSSVar(resolver, entryMeta, '--local-global')).to.equal('--local-global');
    });
});
