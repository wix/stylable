import { expect, use } from 'chai';
import type { AtRule, Declaration, Rule } from 'postcss';
import {
    diagnosticBankReportToStrings,
    expectTransformDiagnostics,
    flatMatch,
    generateStylableResult,
    processSource,
    shouldReportNoDiagnostics,
} from '@stylable/core-test-kit';
import { transformerDiagnostics } from '@stylable/core/dist/index-internal';

const transformerStringDiagnostics = diagnosticBankReportToStrings(transformerDiagnostics);

use(flatMatch);

// ToDo: refactor into feature spec
describe('@st-scope', () => {
    describe('processing scopes', () => {
        it('should parse "@st-scope" directives', () => {
            const meta = processSource(
                `
                @st-scope .root{
                    .part {}
                }
            `,
                { from: 'path/to/style.css' },
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

        it('should parse "@st-scope" directives with a new class', () => {
            const meta = processSource(
                `
                @st-scope .newClass {
                    .part {}
                }
            `,
                { from: 'path/to/style.css' },
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

            expect((meta.targetAst!.nodes[0] as Rule).selector).to.equal(
                '.entry__root .entry__part',
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

            expect((meta.targetAst!.nodes[0] as Rule).selector).to.equal(
                '.entry__scope1 .entry__part1, .entry__scope2 .entry__part1, .entry__scope1 .entry__part2, .entry__scope2 .entry__part2',
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

            expect((meta.targetAst!.nodes[0] as Rule).selector).to.equal('* .entry__part');
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

            expect((meta.targetAst!.nodes[0] as Rule).selector).to.equal('.my-class .entry__part');
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

            expect((meta.targetAst!.nodes[1] as Rule).selector).to.equal(
                '.entry__root .imported__part .entry__part1, .entry__root .imported__part .entry__part2',
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

            expect((meta.targetAst!.first as Rule).selector).to.equal(
                '.imported__importedPart .entry__part',
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

            expect((meta.targetAst!.nodes[2] as Rule).selector).to.equal(
                '.entry__root .entry__part .entry__scopedPart',
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

            expect((meta.targetAst!.nodes[0] as Rule).selector).to.equal(
                '.entry__root .entry__part, .entry__root .entry__otherPart, .entry__root .entry__oneMorePart',
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

            expect(meta.targetAst!.first).to.flatMatch({
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

            expect(meta.targetAst!.first).to.flatMatch({
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

            const rule: Rule = meta.targetAst!.first as Rule;
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

            const rule: Rule = meta.targetAst!.nodes[1] as Rule;
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

            const rule = meta.targetAst!.nodes[1] as Rule;
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

            const atRule = meta.targetAst!.nodes[0] as AtRule;
            const rule = atRule.nodes![0] as Rule;
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

            const { meta } = expectTransformDiagnostics(config, [
                {
                    message: transformerStringDiagnostics.UNKNOWN_PSEUDO_ELEMENT('unknownPart'),
                    file: '/entry.st.css',
                    severity: 'error',
                },
            ]);
            expect((meta.targetAst!.first as Rule).selector).to.equal(
                '.entry__root::unknownPart .entry__part',
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

            const { meta } = expectTransformDiagnostics(config, [
                {
                    message: transformerStringDiagnostics.UNKNOWN_PSEUDO_ELEMENT('unknownPart'),
                    file: '/entry.st.css',
                    severity: 'error',
                },
                {
                    message: transformerStringDiagnostics.UNKNOWN_PSEUDO_ELEMENT('unknownPart'),
                    file: '/entry.st.css',
                    severity: 'error',
                    skipLocationCheck: true,
                },
            ]);
            expect((meta.targetAst!.first as Rule).selector).to.equal(
                '.entry__root::unknownPart .entry__part::unknownPart',
            );
        });
    });
});
