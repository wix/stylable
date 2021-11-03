import { expect, use } from 'chai';
import type { AtRule, Declaration, Rule } from 'postcss';
import {
    expectWarningsFromTransform,
    flatMatch,
    generateStylableResult,
    processSource,
    shouldReportNoDiagnostics,
} from '@stylable/core-test-kit';
import { processorWarnings, SRule, transformerWarnings, getRuleScopeSelector } from '@stylable/core';

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
            const rule = meta.ast.nodes[0] as SRule;
            expect(getRuleScopeSelector(rule)).to.equal('.root');
            expect(getRuleScopeSelector(rule.clone()), 'clone rules preserve stScope').to.equal('.root');
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

            const rules = meta.ast.nodes;

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

            expect((meta.outputAst!.nodes[0] as Rule).selector).to.equal(
                '.entry__root .entry__part'
            );
        });

        it('should support multiple selectors', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope .scope1, .scope2 {
                            .part1, .part2 {}
                        }
                        `,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            expect((meta.outputAst!.nodes[0] as Rule).selector).to.equal(
                '.entry__scope1 .entry__part1, .entry__scope2 .entry__part1, .entry__scope1 .entry__part2, .entry__scope2 .entry__part2'
            );
        });

        it('should support * selector', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope * {
                            .part {}
                        }
                        `,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            expect((meta.outputAst!.nodes[0] as Rule).selector).to.equal('* .entry__part');
        });

        it('should support :global() selector', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope :global(.my-class) {
                            .part {}
                        }
                        `,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            expect((meta.outputAst!.nodes[0] as Rule).selector).to.equal('.my-class .entry__part');
        });

        it('should selectors with internal parts', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {-st-from: "./imported.st.css"; -st-default: Imported;}
                        .root {
                            -st-extends: Imported;
                        }
                        @st-scope .root::part {
                            .part1, .part2 {}
                        }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                        .part{}
                        `,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            expect((meta.outputAst!.nodes[1] as Rule).selector).to.equal(
                '.entry__root .imported__part .entry__part1, .entry__root .imported__part .entry__part2'
            );
        });

        it('should allow named classes as scoping selector', () => {
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
                        @st-scope .importedPart {
                            .part {}
                        }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `.importedPart {}`,
                    },
                },
            };

            const { meta } = generateStylableResult(config);

            shouldReportNoDiagnostics(meta);

            expect((meta.outputAst!.first as Rule).selector).to.equal(
                '.imported__importedPart .entry__part'
            );
        });

        it('should support complex selector as scope', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {}
                        .part {}
                        @st-scope .root .part {
                            .scopedPart {}
                        }
                    `,
                    },
                },
            };
            const { meta } = generateStylableResult(config);

            shouldReportNoDiagnostics(meta);

            expect((meta.outputAst!.nodes[2] as Rule).selector).to.equal(
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

            expect((meta.outputAst!.nodes[0] as Rule).selector).to.equal(
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

        it('scoped classes should be mixable if the scope is the mixin class', () => {
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
                        .mymix {}
                        @st-scope .mymix {
                            .part {
                                color: red;
                            }
                        }`,
                    },
                },
            });

            shouldReportNoDiagnostics(meta);

            const rule: Rule = meta.outputAst!.nodes[1] as Rule;
            const decl: Declaration = rule.first as Declaration;
            expect(decl.value).to.equal('red');
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

            const rule = meta.outputAst!.nodes[1] as Rule;
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

            const atRule = meta.outputAst!.nodes[0] as AtRule;
            const rule = atRule.nodes[0] as Rule;
            expect(rule.selector).to.equal('.entry__root .entry__part');
        });
    });

    describe('diagnostics', () => {
        it('should warn about invalid scoping selector', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@st-scope .root::unknownPart {
                            .part {}
                        }|
                        `,
                    },
                },
            };

            const { meta } = expectWarningsFromTransform(config, [
                {
                    message: transformerWarnings.UNKNOWN_PSEUDO_ELEMENT('unknownPart'),
                    file: '/entry.st.css',
                    severity: 'warning',
                },
            ]);
            expect((meta.outputAst!.first as Rule).selector).to.equal(
                '.entry__root::unknownPart .entry__part'
            );
        });
        it('should warn on invalid scoped selector', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@st-scope .root::unknownPart {
                            .part::unknownPart {}
                        }|
                        `,
                    },
                },
            };

            const { meta } = expectWarningsFromTransform(config, [
                {
                    message: transformerWarnings.UNKNOWN_PSEUDO_ELEMENT('unknownPart'),
                    file: '/entry.st.css',
                    severity: 'warning',
                },
                {
                    message: transformerWarnings.UNKNOWN_PSEUDO_ELEMENT('unknownPart'),
                    file: '/entry.st.css',
                    severity: 'warning',
                    skipLocationCheck: true,
                },
            ]);
            expect((meta.outputAst!.first as Rule).selector).to.equal(
                '.entry__root::unknownPart .entry__part::unknownPart'
            );
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
                    severity: 'error',
                },
            ]);
        });
    });
});
