import { expect, use } from 'chai';
import { AtRule, Declaration, Rule } from 'postcss';
import { processorWarnings } from '../src';
import { flatMatch } from './matchers/flat-match';
import { expectWarnings, expectWarningsFromTransform } from './utils/diagnostics';
import { generateStylableResult, generateStylableRoot, processSource } from './utils/generate-test-util';

use(flatMatch);

describe('@st-scope', () => {
    describe('processing scopes', () => {
        it('should parse "@st-scope" directives', () => {
            const meta = processSource(
                `
                .root {}
                @st-scope root {
                    .part {}
                }
            `,
                { from: 'path/to/style.css' }
            );

            expect(meta.scopes).to.flatMatch([{
                type: 'atrule',
                name: 'st-scope',
                params: 'root'
            }]);
        });

        it('handle multiple scopes', () => {
            const meta = processSource(
                `
                .root {}
                .part {}
                @st-scope root part {
                    .scopedPart {}
                }
            `,
                { from: 'path/to/style.css' }
            );

            expect(meta.scopes).to.flatMatch([{
                type: 'atrule',
                name: 'st-scope',
                params: 'root part'
            }]);
        });

        it('should mark scope ref name on impacted rules', () => {
            const meta = processSource(
                `
                .root {}
                @st-scope root {
                    .part {}
                    .otherPart {}
                }
            `,
                { from: 'path/to/style.css' }
            );

            const rules = meta.ast.nodes!;
            expect((rules[1] as Rule).selector).to.equal('.root .part');
            expect((rules[2] as Rule).selector).to.equal('.root .otherPart');
            expect(rules[3]).to.eql(undefined);
        });
    });

    describe('transforming scoped selectors', () => {
        it('should scope "part" class to root', () => {
            const res = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .root {}
                        @st-scope root {
                            .part {}
                        }
                        `
                    }
                }
            });

            expect(res.nodes).to.flatMatch([{
                selector: '.entry--root'
            }, {
                selector: '.entry--root .entry--part'
            }
            ]);
        });

        it('should scope part using a default import', () => {
            const res = generateStylableRoot({
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
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `.root {}`
                    }
                }
            });

            expect(res.nodes![0]).to.flatMatch({
                selector: '.imported--root .entry--part'
            });
        });

        it('should scope part using a named import', () => {
            const res = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: './imported.st.css';
                            -st-named: importedPart;
                        }
                        @st-scope importedPart {
                            .part {}
                        }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `.importedPart {}`
                    }
                }
            });

            expect(res.nodes![0]).to.flatMatch({
                selector: '.imported--importedPart .entry--part'
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
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                        @st-scope root {
                            .mymix {
                                color: red;
                            }
                        }`
                    }
                }
            });

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
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                        @st-scope root {
                            .mymix {
                                -st-states: myState;
                            }
                        }`
                    }
                }
            });

            const rule = meta.outputAst!.nodes![1] as Rule;
            expect(rule.selector).to.equal('.entry--root[data-imported-mystate]');
        });

        it('scope with media queries', () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope root {
                            @media screen (max-width: 100px) {
                                .part {}
                            }
                        }
                        `
                    }
                }
            });

            const atRule = meta.outputAst!.nodes![0] as AtRule;
            const rule = atRule.nodes![0] as Rule;
            expect(rule.selector).to.equal('.entry--root .entry--part');
        });
    });

    describe('diagnostics', () => {
        it('should warn about disallowed syntax as a scoping parameter (".")', () => {
            const res = expectWarnings(`
                |@st-scope $.root$ {
                    .part {}
                }|
            `, [
                { message: processorWarnings.DISALLOWED_PARAM_IN_SCOPE(), file: 'entry.st.css', severity: 'error' }
            ]);
        });

        it('should warn about vars definition inside a scope', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope root {
                            |:vars {
                                myColor: red;
                            }|

                            .part {}
                        }
                    `
                    }
                }
            };

            const { meta } = expectWarningsFromTransform(config, [
                { message: processorWarnings.NO_VARS_DEF_IN_ST_SCOPE(), file: '/entry.st.css', severity: 'warning' }
            ]);
            expect((meta.outputAst!.first as Rule).selector).to.equal('.entry--root .entry--part');
        });

        it('should warn about import usage inside a scope', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        @st-scope root {
                            |:import {
                                -st-from: "imported.st.css";
                                -st-default: Comp;
                            }|

                            .part {}
                        }
                    `
                    }
                }
            };

            const { meta } = expectWarningsFromTransform(config, [
                { message: processorWarnings.NO_IMPORT_IN_ST_SCOPE(), file: '/entry.st.css', severity: 'warning' }
            ]);
            expect((meta.outputAst!.first as Rule).selector).to.equal('.entry--root .entry--part');
        });
    });
});
