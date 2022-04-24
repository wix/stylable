import { expect } from 'chai';
import { visitMetaCSSDependencies } from '@stylable/core/dist/visit-meta-css-dependencies';
import { generateInfra } from '@stylable/core-test-kit';

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

                            :import {
                                -st-from: "./mixin";
                                -st-named: color;
                            }

                            .root {
                                color: value(color)
                            }
                        `,
                },
                '/d1.1.st.css': {
                    namespace: 'd1_1',
                    content: `
                            :import {
                                -st-from: "./d2.st.css";
                                -st-default: D2;
                            }

                            :import {
                                -st-from: "./mixin";
                                -st-named: color;
                            }

                            .root {
                                color: value(color)
                            }
                        `,
                },
                '/mixin.js': {
                    content: `
                            module.exports = {
                                color: 'red'
                            }
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
        const items: { source: string; depth: number }[] = [];

        for (const dep of visitMetaCSSDependencies({ meta: entryMeta, resolver })) {
            items.push({
                depth: dep.kind === 'css' ? dep.depth : -1,
                source: dep.resolvedPath,
            });
        }

        expect(items).to.eql([
            { source: '/d1.st.css', depth: 1 },
            { source: '/d1.1.st.css', depth: 1 },
            { source: '/d2.st.css', depth: 2 },
            { source: '/mixin.js', depth: -1 },
        ]);
    });
});
