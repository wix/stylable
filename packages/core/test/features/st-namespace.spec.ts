import chaiSubset from 'chai-subset';
import { testStylableCore, shouldReportNoDiagnostics } from '@stylable/core-test-kit';
import chai, { expect } from 'chai';
import { resolve } from 'path';
import { STNamespace } from '@stylable/core/dist/features';

chai.use(chaiSubset);

const diagnostics = STNamespace.diagnostics;

describe('features/st-namespace', () => {
    it('should use filename as default namespace', () => {
        const { sheets } = testStylableCore({
            '/a.st.css': ``,
            '/b.st.css': ``,
        });

        const AMeta = sheets['/a.st.css'].meta;
        const BMeta = sheets['/b.st.css'].meta;

        expect(AMeta.namespace, 'a meta.namespace').to.eql('a');
        expect(BMeta.namespace, 'b meta.namespace').to.eql('b');
    });
    it('should override default namespace with @st-namespace', () => {
        const { sheets } = testStylableCore({
            '/other.st.css': `
                /* @transform-remove */
                @st-namespace "button";

                /* @rule .button__x */
                .x {}
            `,
        });

        const { meta, exports } = sheets['/other.st.css'];

        shouldReportNoDiagnostics(meta);

        expect(meta.namespace, 'meta.namespace').to.eql('button');

        // JS exports
        expect(exports.classes.x, `JS export`).to.eql('button__x');
    });
    it('should prefer st-namespace-reference path to calculate hash part of namespace', () => {
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
    it('should collect last namespace definition', () => {
        const { sheets } = testStylableCore({
            '/entry.st.css': `
                /* @transform-remove */
                @st-namespace "a";

                /* @transform-remove */
                @st-namespace "b";
            `,
        });

        const { meta } = sheets['/entry.st.css'];

        expect(meta.namespace, 'meta.namespace').to.eql('b');
    });
    it('should ignore comments and spaces', () => {
        const { sheets } = testStylableCore({
            '/other.st.css': `
                /* @transform-remove */
                @st-namespace /*c1*//*c2*/ "button"/*c3*/ ;

                /* @rule .button__x */
                .x {}
            `,
        });

        const { meta, exports } = sheets['/other.st.css'];

        shouldReportNoDiagnostics(meta);

        expect(meta.namespace, 'meta.namespace').to.eql('button');

        // JS exports
        expect(exports.classes.x, `JS export`).to.eql('button__x');
    });
    it('should accept ident-like value', () => {
        const { sheets } = testStylableCore({
            '/emoji.st.css': `
                @st-namespace "🤡abc🤡";

                /* ToDo: fix inline expectation issue with emoji comparison */
                /* skip-rule .🤡abc🤡__x */
                .x {}
            `,
            '/numbers.st.css': `
                @st-namespace "x123";

                /* @rule .x123__x */
                .x {}
            `,
            '/underscore.st.css': `
                @st-namespace "_x123_";

                /* @rule ._x123___x */
                .x {}
            `,
            '/dash.st.css': `
                @st-namespace "---";

                /* x-@rule .\\---__x */
                .x {}
            `,
        });
        const emojiMeta = sheets['/emoji.st.css'].meta;
        const numbersMeta = sheets['/numbers.st.css'].meta;
        const underscoreMeta = sheets['/underscore.st.css'].meta;
        const dashMeta = sheets['/dash.st.css'].meta;

        shouldReportNoDiagnostics(emojiMeta);
        expect(emojiMeta.namespace, ' emoji namespace').to.eql('🤡abc🤡');

        shouldReportNoDiagnostics(numbersMeta);
        expect(numbersMeta.namespace, 'numbers namespace').to.eql('x123');

        shouldReportNoDiagnostics(underscoreMeta);
        expect(underscoreMeta.namespace, 'underscore namespace').to.eql('_x123_');

        shouldReportNoDiagnostics(dashMeta);
        expect(dashMeta.namespace, 'dash namespace').to.eql('---');
    });
    it('should report non string namespace', () => {
        const { sheets } = testStylableCore({
            '/entry.st.css': `
                /* 
                    @transform-remove
                    @analyze-error(not string) ${diagnostics.INVALID_NAMESPACE_DEF()}
                */
                @st-namespace App;

                /* 
                    @transform-remove
                    @analyze-error(multiple strings) word("b") ${diagnostics.EXTRA_DEFINITION()}
                */
                @st-namespace "a""b";

                /* 
                    @transform-remove
                    @analyze-error(ident+string) word(ident) ${diagnostics.EXTRA_DEFINITION()}
                */
                @st-namespace ident "a";
            `,
        });

        const { meta } = sheets['/entry.st.css'];

        expect(meta.namespace, 'meta.namespace').to.eql('entry');
    });
    it('should report empty namespace', () => {
        const { sheets } = testStylableCore({
            '/entry.st.css': `
                /* 
                    @transform-remove
                    @analyze-error(spaced) ${diagnostics.EMPTY_NAMESPACE_DEF()}
                */
                @st-namespace '    ';
                
                /* 
                    @transform-remove
                    @analyze-error(empty) ${diagnostics.EMPTY_NAMESPACE_DEF()}
                */
                @st-namespace ;
            `,
        });

        const { meta } = sheets['/entry.st.css'];

        expect(meta.namespace, 'meta.namespace').to.eql('entry');
    });
    it('should report non valid namespace value', () => {
        const { sheets } = testStylableCore({
            '/entry.st.css': `
                /* 
                    @transform-remove
                    @analyze-error(dot) word(a.b) ${diagnostics.INVALID_NAMESPACE_VALUE()}
                */
                @st-namespace "a.b";

                /* 
                    @transform-remove
                    @analyze-error(colon+slash) word(a://b) ${diagnostics.INVALID_NAMESPACE_VALUE()}
                */
                @st-namespace "a://b";
                
                /* 
                    @transform-remove
                    @analyze-error(start with number) word(5abc) ${diagnostics.INVALID_NAMESPACE_VALUE()}
                */
                @st-namespace "5abc";
            `,
        });

        const { meta } = sheets['/entry.st.css'];

        expect(meta.namespace, 'meta.namespace').to.eql('entry');
    });
    it('should report invalid namespace reference', () => {
        testStylableCore({
            'a.st.css': `
                /* @analyze-error ${diagnostics.INVALID_NAMESPACE_REFERENCE()} */
                /* st-namespace-reference */
            `,
        });
    });
    describe('legacy @namespace behavior', () => {
        /*
            @namespace was previously used instead of @st-namespace.
            In order to preserve backwards compatibility, @namespace will
            continue to define the stylable namespace under specific conditions.
        */
        it('should override default namespace with @namespace', () => {
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
            // ToDo: stop removing @namespace
            // expect(meta.targetAst!.toString(), 'not removed').to.eql('@namespace "button"');

            // JS exports
            expect(exports.classes.x, `JS export`).to.eql('button__x');
        });
        it.skip('should prefer @st-namespace over @namespace');
        it('should not use @namespace with prefix, url() or invalid namespace', () => {
            const { sheets } = testStylableCore({
                '/entry.st.css': `
                    @namespace "http://www.w3.org/1999/xhtml";
                    @namespace prefix "button";
                    @namespace url("button");
                    @namespace prefix url("button");
    
                    /* @rule .entry__x */
                    .x {}
                `,
            });

            const { meta, exports } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);

            expect(meta.namespace, 'meta.namespace').to.eql('entry');
            // expect(meta.targetAst!.toString(), 'not removed').to.satisfy((output: string) =>
            //     [
            //         '@namespace "http://www.w3.org/1999/xhtml";',
            //         '@namespace prefix "button"',
            //         '@namespace url("button")',
            //         '@namespace prefix url("button")',
            //     ].every((def) => output.includes(def))
            // );

            // JS exports
            expect(exports.classes.x, `JS export`).to.eql('entry__x');
        });
    });
    describe('stylable API', () => {
        it('should resolve namespace via resolveNamespace', () => {
            const { sheets } = testStylableCore(
                {
                    '/a.st.css': ``,
                    '/b.st.css': `@st-namespace "x";`,
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
