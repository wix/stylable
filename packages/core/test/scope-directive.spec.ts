import {
    expectWarnings,
    expectWarningsFromTransform,
    flatMatch,
    generateStylableResult,
    processSource,
    shouldReportNoDiagnostics,
} from '@stylable/core-test-kit';
import { expect, use } from 'chai';
import { AtRule, Declaration, Rule } from 'postcss';
import { processorWarnings, SRule } from '../src';
import { transformerWarnings } from '../src/stylable-transformer';
// import { generateStylableResult, processSource } from './utils/generate-test-util';

use(flatMatch);

describe('@st-scope', () => {
    describe('processing scopes', () => {
        it('should parse "@st-scope" directives', () => {
            const meta = processSource(
                `
                @st-scope .root{
                    .part {}
                }
            `,
                { from: 'path/to/style.css' }
            );

            shouldReportNoDiagnostics(meta);
            expect(meta.scopes).to.flatMatch([
                {
                    type: 'atrule',
                    name: 'st-scope',
                    params: '.root',
                },
            ]);
        });
        it('should annotate rules under "@st-scope"', () => {
            const meta = processSource(
                `
                @st-scope .root{
                    .part {}
                }
            `,
                { from: 'path/to/style.css' }
            );

            shouldReportNoDiagnostics(meta);
            const rule = meta.ast.nodes![0] as SRule;
            expect(rule.stScopeSelector).to.equal('.root');
            expect(rule.clone().stScopeSelector, 'clone rules preserve stScope').to.equal('.root');
        });

        it('should parse "@st-scope" directives with a new class', () => {
            const meta = processSource(
                `
                @st-scope .newClass {
                    .part {}
                }
            `,
                { from: 'path/to/style.css' }
            );

            shouldReportNoDiagnostics(meta);
            expect(meta.scopes).to.flatMatch([
                {
                    type: 'atrule',
                    name: 'st-scope',
                    params: '.newClass',
                },
            ]);
        });

        it('should mark scope ref name on impacted rules', () => {
            const meta = processSource(
                `
                @st-scope .root {
                    .part {}
                    .otherPart {}
                }
            `,
                { from: 'path/to/style.css' }
            );

            const rules = meta.ast.nodes!;

            shouldReportNoDiagnostics(meta);

            expect((rules[0] as Rule).selector).to.equal('.root .part');
            expect((rules[1] as Rule).selector).to.equal('.root .otherPart');
            expect(rules[2]).to.eql(undefined);
        });
    });

    describe('transforming scoped selectors', () => {
        it('should scope "part" class to root', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope .root {
                            .part {}
                        }
                        `,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            expect((meta.outputAst!.nodes![0] as Rule).selector).to.equal(
                '.entry__root .entry__part'
            );
        });

        it('should scope rule with multiple selectors to root', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope .root {
                            .part, .otherPart, .oneMorePart {}
                        }
                        `,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            expect((meta.outputAst!.nodes![0] as Rule).selector).to.equal(
                '.entry__root .entry__part, .entry__root .entry__otherPart, .entry__root .entry__oneMorePart'
            );
        });

        it('should scope "part" class using a default import', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: './imported.st.css';
                            -st-default: Comp;
                        }
                        @st-scope Comp {
                            .part {}
                        }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `.root {}`,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            expect(meta.outputAst!.first).to.flatMatch({
                selector: '.imported__root .entry__part',
            });
        });

        it('should scope "Comp" class using a default import', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: './imported.st.css';
                            -st-default: Comp;
                        }
                        @st-scope .root {
                            Comp {}
                        }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `.root {}`,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            expect(meta.outputAst!.first).to.flatMatch({
                selector: '.entry__root .imported__root',
            });
        });

        it('scoped classes should not be mixable (into another class or element)', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: './imported.st.css';
                            -st-named: mymix;
                        }
                        .root {
                            -st-mixin: mymix;
                        }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                        @st-scope .root {
                            .mymix {
                                color: red;
                            }
                        }`,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            const rule: Rule = meta.outputAst!.first as Rule;
            const decl: Declaration = rule.first as Declaration;
            expect(decl).to.equal(undefined);
        });

        it('scoped classes should be agnostic about -st-extend', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: './imported.st.css';
                            -st-named: mymix;
                        }
                        .root {
                            -st-extends: mymix;
                        }
                        .root:myState {
                            color: red;
                        }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                        @st-scope .root {
                            .mymix {
                                -st-states: myState;
                            }
                        }`,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            const rule = meta.outputAst!.nodes![1] as Rule;
            expect(rule.selector).to.equal('.entry__root.imported--myState');
        });

        it('scope with media queries', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope .root {
                            @media screen (max-width: 100px) {
                                .part {}
                            }
                        }
                        `,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            const atRule = meta.outputAst!.nodes![0] as AtRule;
            const rule = atRule.nodes![0] as Rule;
            expect(rule.selector).to.equal('.entry__root .entry__part');
        });
    });

    describe('diagnostics', () => {
        it('should warn about multiple params in scope', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {}
                        .part {}
                        |@st-scope $.root .part$ {
                            .scopedPart {}
                        }|
                    `,
                    },
                },
            };

            const { meta } = expectWarningsFromTransform(config, [
                {
                    message: processorWarnings.SCOPE_PARAM_NOT_SIMPLE_SELECTOR('.root .part'),
                    file: '/entry.st.css',
                    severity: 'warning',
                },
                {
                    message: transformerWarnings.UNKNOWN_SCOPING_PARAM('.root .part'),
                    file: '/entry.st.css',
                    severity: 'error',
                },
            ]);

            expect((meta.outputAst!.nodes![2] as Rule).selector).to.equal(
                '.entry__root .entry__part .entry__scopedPart'
            );
            expect(meta.scopes).to.flatMatch([
                {
                    type: 'atrule',
                    name: 'st-scope',
                    params: '.root .part',
                },
            ]);
        });

        it('should warn about disallowed syntax as a scoping parameter', () => {
            expectWarnings(
                `
                |@st-scope $.root::before$ {
                    .part {}
                }|
            `,
                [
                    {
                        message: processorWarnings.SCOPE_PARAM_NOT_SIMPLE_SELECTOR('.root::before'),
                        file: 'entry.st.css',
                        severity: 'warning',
                    },
                ]
            );
        });

        it('should warn about scoping with a symbol that does not resolve to a stylesheet root', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: './imported.st.css';
                            -st-named: importedPart;
                        }
                        |@st-scope $importedPart$ {
                            .part {}
                        }|
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `.importedPart {}`,
                    },
                },
            };

            const { meta } = expectWarningsFromTransform(config, [
                {
                    message: transformerWarnings.SCOPE_PARAM_NOT_ROOT('importedPart'),
                    file: '/entry.st.css',
                    severity: 'error',
                },
            ]);
            expect((meta.outputAst!.first as Rule).selector).to.equal('importedPart .entry__part');
        });

        it('should warn about scoping with a symbol that originates from a JS file', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: './imported.js';
                            -st-named: someVar;
                        }
                        |@st-scope $someVar$ {
                            .part {}
                        }|
                        `,
                    },
                    '/imported.js': {
                        namespace: 'imported',
                        content: `
                            module.exports = {
                                someVar: 'someValue'
                            }
                        `,
                    },
                },
            };

            const { meta } = expectWarningsFromTransform(config, [
                {
                    message: transformerWarnings.SCOPE_PARAM_NOT_CSS('someVar'),
                    file: '/entry.st.css',
                    severity: 'error',
                },
            ]);
            expect((meta.outputAst!.first as Rule).selector).to.equal('someVar .entry__part');
        });

        it('should warn about a missing scoping parameter', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@st-scope {
                            .part {}
                        }|
                        `,
                    },
                },
            };

            const { meta } = expectWarningsFromTransform(config, [
                {
                    message: processorWarnings.MISSING_SCOPING_PARAM(),
                    file: '/entry.st.css',
                    severity: 'warning',
                },
            ]);
            expect((meta.outputAst!.first as Rule).selector).to.equal('.entry__part');
        });

        it('should warn about an unknown scoping parameter', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@st-scope $unknown$ {
                            .part {}
                        }|
                        `,
                    },
                },
            };
            const { meta } = expectWarningsFromTransform(config, [
                {
                    message: transformerWarnings.UNKNOWN_SCOPING_PARAM('unknown'),
                    file: '/entry.st.css',
                    severity: 'error',
                },
            ]);
            expect((meta.outputAst!.first as Rule).selector).to.equal('unknown .entry__part');
        });

        it('should warn about vars definition inside a scope', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope .root {
                            |:vars {
                                myColor: red;
                            }|

                            .part {}
                        }
                    `,
                    },
                },
            };

            const { meta } = expectWarningsFromTransform(config, [
                {
                    message: processorWarnings.NO_VARS_DEF_IN_ST_SCOPE(),
                    file: '/entry.st.css',
                    severity: 'warning',
                },
            ]);
            expect((meta.outputAst!.first as Rule).selector).to.equal('.entry__root .entry__part');
        });

        it('should warn about import usage inside a scope', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope .root {
                            |:import {
                                -st-from: "imported.st.css";
                                -st-default: Comp;
                            }|

                            .part {}
                        }
                    `,
                    },
                },
            };

            const { meta } = expectWarningsFromTransform(config, [
                {
                    message: processorWarnings.NO_IMPORT_IN_ST_SCOPE(),
                    file: '/entry.st.css',
                    severity: 'warning',
                },
            ]);
            expect((meta.outputAst!.first as Rule).selector).to.equal('.entry__root .entry__part');
        });

        it('should warn about @keyframe usage inside a scope', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope .root {
                            |@keyframes frames {
                                from {
                                    margin: 100%;
                                }
                                to {
                                    margin: 0%;
                                }
                            }|
                        }
                    `,
                    },
                },
            };

            expectWarningsFromTransform(config, [
                {
                    message: processorWarnings.NO_KEYFRAMES_IN_ST_SCOPE(),
                    file: '/entry.st.css',
                    severity: 'warning',
                },
            ]);
        });
    });
});
