import { expect } from 'chai';
import { visitMetaCSSDependenciesBFS } from '@stylable/core';
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

        visitMetaCSSDependenciesBFS(
            entryMeta,
            ({ source }, _, depth) => {
                items.push({ source, depth });
            },
            resolver,
            (source) => {
                items.push({ source, depth: -1 });
            }
        );

        expect(items).to.eql([
            { source: '/d1.st.css', depth: 1 },
            { source: '/d1.1.st.css', depth: 1 },
            { source: '/d2.st.css', depth: 2 },
            { source: '/mixin.js', depth: -1 },
        ]);
    });
});
