import chaiSubset from 'chai-subset';
import { testStylableCore, shouldReportNoDiagnostics } from '@stylable/core-test-kit';
import chai, { expect } from 'chai';
import { resolve } from 'path';
import { STNamespace } from '@stylable/core/dist/features';

chai.use(chaiSubset);

const diagnostics = STNamespace.diagnostics;

describe(`features/st-namespace`, () => {
    it(`should use filename as default namespace`, () => {
        const { sheets } = testStylableCore({
            '/a.st.css': ``,
            '/b.st.css': ``,
        });

        const AMeta = sheets['/a.st.css'].meta;
        const BMeta = sheets['/b.st.css'].meta;

        expect(AMeta.namespace, 'a meta.namespace').to.eql('a');
        expect(BMeta.namespace, 'b meta.namespace').to.eql('b');
    });
    it(`should override default namespace`, () => {
        const { sheets } = testStylableCore({
            '/other.st.css': `
                /* @transform-remove */
                @namespace "button";

                /* @rule .button__x */
                .x {}
            `,
        });

        const { meta, exports } = sheets['/other.st.css'];

        shouldReportNoDiagnostics(meta);

        expect(meta.namespace, 'meta.namespace').to.eql('button');

        // JS exports
        expect(exports.classes.x, `JS export`).to.eql(`button__x`);
    });
    it(`should prefer st-namespace-reference path to calculate hash`, () => {
        // assure namespace generated with st-namespace-reference
        // is identical between source and dist with the relative correction
        const { sheets } = testStylableCore(
            {
                '/dist/a.st.css': `
                /* st-namespace-reference="../path/to/a.st.css" */
            `,
                '/dist/b.st.css': `
                @namespace "xxx";
                /* st-namespace-reference="../path/to/b.st.css" */
            `,
            },
            {
                stylableConfig: {
                    // override test util with the default behavior
                    // that takes the origin sheet path reference into account
                    resolveNamespace: STNamespace.defaultProcessNamespace,
                },
            }
        );

        const AMeta = sheets['/dist/a.st.css'].meta;
        const BMeta = sheets['/dist/b.st.css'].meta;

        expect(AMeta.namespace, 'a meta.namespace').to.eql(
            STNamespace.defaultProcessNamespace('a', resolve('/path/to/a.st.css'))
        );
        expect(BMeta.namespace, 'b meta.namespace').to.eql(
            STNamespace.defaultProcessNamespace('xxx', resolve('/path/to/b.st.css'))
        );
    });
    it(`should collect last namespace definition`, () => {
        const { sheets } = testStylableCore({
            '/entry.st.css': `
                /* @transform-remove */
                @namespace "a";

                /* @transform-remove */
                @namespace "b";
            `,
        });

        const { meta } = sheets['/entry.st.css'];

        expect(meta.namespace, 'meta.namespace').to.eql('b');
    });
    it(`should report non string namespace`, () => {
        const { sheets } = testStylableCore({
            '/entry.st.css': `
                /* 
                    @transform-remove
                    @analyze-error ${diagnostics.INVALID_NAMESPACE_DEF()}
                */
                @namespace App;
            `,
        });

        const { meta } = sheets['/entry.st.css'];

        expect(meta.namespace, 'meta.namespace').to.eql('entry');
    });
    it(`should report empty namespace`, () => {
        const { sheets } = testStylableCore({
            '/entry.st.css': `
                /* 
                    @transform-remove
                    @analyze-error ${diagnostics.EMPTY_NAMESPACE_DEF()}
                */
                @namespace '    ';
            `,
        });

        const { meta } = sheets['/entry.st.css'];

        expect(meta.namespace, 'meta.namespace').to.eql('entry');
    });
    describe('stylable API', () => {
        it(`should resolve namespace via resolveNamespace`, () => {
            const { sheets } = testStylableCore(
                {
                    '/a.st.css': ``,
                    '/b.st.css': `@namespace "x";`,
                },
                {
                    stylableConfig: {
                        resolveNamespace(namespace) {
                            return 'test-' + namespace;
                        },
                    },
                }
            );

            const aMeta = sheets['/a.st.css'].meta;
            const bMeta = sheets['/b.st.css'].meta;

            expect(aMeta.namespace, 'a meta.namespace').to.eql('test-a');
            expect(bMeta.namespace, 'b meta.namespace').to.eql('test-x');
        });
    });
});
