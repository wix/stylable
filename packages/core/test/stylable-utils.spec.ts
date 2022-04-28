import { expect } from 'chai';
import { visitMetaCSSDependencies } from '@stylable/core/dist/visit-meta-css-dependencies';
import { testStylableCore } from '@stylable/core-test-kit';

describe('visitMetaCSSDependenciesBFS', () => {
    it('should traverse imports BFS with depth indication', () => {
        const { stylable } = testStylableCore({
            'entry.st.css': `
                :import {
                    -st-from: "./d1.st.css";
                    -st-default: D1;
                }
                :import {
                    -st-from: "./d1_1.st.css";
                    -st-default: D1_1;
                }
                .root {}
            `,
            'd1.st.css': `
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
            'd1_1.st.css': `
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
            'mixin.js': `
                module.exports = {
                    color: 'red'
                }
            `,
            'd2.st.css': `
                .root {}
            `,
        });

        const resolver = stylable.resolver;
        const entryMeta = stylable.fileProcessor.process('/entry.st.css');
        const items: { source: string; depth: number }[] = [];

        for (const dep of visitMetaCSSDependencies({ meta: entryMeta, resolver })) {
            items.push({
                depth: dep.kind === 'css' ? dep.depth : -1,
                source: dep.resolvedPath,
            });
        }

        expect(items).to.eql([
            { source: '/d1.st.css', depth: 1 },
            { source: '/d1_1.st.css', depth: 1 },
            { source: '/d2.st.css', depth: 2 },
            { source: '/mixin.js', depth: -1 },
        ]);
    });
});
