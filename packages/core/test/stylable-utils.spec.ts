import { generateInfra } from '@stylable/core-test-kit';
import { expect } from 'chai';
import { spy } from 'sinon';
import { scopeCSSVar, generateScopedCSSVar, visitMetaCSSDependenciesBFS } from '@stylable/core';

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

describe('visitMetaCSSDependenciesBFS', () => {
    it('should traverse imports BFS with depth indication', () => {
        const { resolver, fileProcessor } = generateInfra({
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                            :import {
                                -st-from: "./d1.st.css";
                                -st-default: D1;
                            }
                            :import {
                                -st-from: "./d1.1.st.css";
                                -st-default: D1_1;
                            }
                            .root {}

                        `,
                },
                '/d1.st.css': {
                    namespace: 'd1',
                    content: `
                            :import {
                                -st-from: "./d2.st.css";
                                -st-default: D2;
                            }

                            .root {}
                        `,
                },
                '/d1.1.st.css': {
                    namespace: 'd1_1',
                    content: `
                            :import {
                                -st-from: "./d2.st.css";
                                -st-default: D2;
                            }

                            .root {}
                        `,
                },
                '/d2.st.css': {
                    namespace: 'd2',
                    content: `
                            .root {}
                        `,
                },
            },
        });

        const entryMeta = fileProcessor.process('/entry.st.css');
        const visitor = spy();

        visitMetaCSSDependenciesBFS(entryMeta, visitor, resolver);

        const items = visitor.getCalls().map(({ args }) => {
            return {
                source: args[0].source,
                depth: args[2],
            };
        });

        expect(items).to.eql([
            { source: '/d1.st.css', depth: 1 },
            { source: '/d1.1.st.css', depth: 1 },
            { source: '/d2.st.css', depth: 2 },
        ]);
    });
});
