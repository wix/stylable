import * as chai from 'chai';
import {generateStylableOutput} from '../utils/generate-test-util';

const expect = chai.expect;

describe('bundle: theme', () => {

    describe('insertion', () => {

        it('should be above used file that import it as theme', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                            }
                            .b { color:green; }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            .a { color:red; }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.theme--root .theme--a { color:red; }',

                '.entry--root .entry--b { color:green; }'
            ].join('\n'));
        });

        it('should be once for multiple theme imports', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/entry2.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                            }
                            .a1 { color:red; }
                        `
                    },
                    '/entry2.st.css': {
                        namespace: 'entry2',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                            }
                            .a2 { color:green; }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            .x { color:blue; }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.theme--root .theme--x { color:blue; }',

                '.entry2--root .entry2--a2 { color:green; }',

                '.entry--root .entry--a1 { color:red; }'
            ].join('\n'));
        });

        it('should be above file importing it with no theme flag', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/comp.st.css',
                    '/comp2.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                            }
                            .a { color:red; }
                        `
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: `
                            .b { color:green; }
                        `
                    },
                    '/comp2.st.css': {
                        namespace: 'comp2',
                        content: `
                            :import {
                                -st-from: "./theme.st.css";
                            }
                            .c { color:blue; }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            .d { color:black; }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.theme--root .theme--d { color:black; }',

                '.comp2--root .comp2--c { color:blue; }',

                '.comp--root .comp--b { color:green; }',

                '.entry--root .entry--a { color:red; }'
            ].join('\n'));
        });

    });

    describe('override vars', () => {

        it('should add override classes scoped to overriding file', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                color1: gold;
                            }
                            .a { color:red; }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :vars {
                                color1:green;
                            }
                            .x { color:value(color1); }
                            .y { background:value(color1); }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.theme--root .theme--x { color:green; }',
                '.entry--root .theme--x { color:gold; }',
                '.theme--root .theme--y { background:green; }',
                '.entry--root .theme--y { background:gold; }',

                '.entry--root .entry--a { color:red; }'
            ].join('\n'));
        });

        it('should add only effected CSS', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                color1: gold;
                            }
                            .b { color:green; }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :vars {
                                color1:red;
                            }
                            .a { color:value(color1); background:yellow; }
                            .c { color:purple; }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                `.theme--root .theme--a { color:red; background:yellow; }`,
                `.entry--root .theme--a { color:gold; }`,
                `.theme--root .theme--c { color:purple; }`,

                `.entry--root .entry--b { color:green; }`
            ].join('\n'));
        });

        it('should position override CSS after original CSS', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/comp.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                color1: gold;
                            }
                            .b { color:green; }
                        `
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: `
                            :import {
                                -st-from: "./theme.st.css";
                            }
                            .x { color:blue; }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :vars {
                                color1:red;
                            }
                            .a { color:value(color1); }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.theme--root .theme--a { color:red; }',
                '.entry--root .theme--a { color:gold; }',

                '.comp--root .comp--x { color:blue; }',

                '.entry--root .entry--b { color:green; }'
            ].join('\n'));
        });

        it('should effect nested themes (override all the way to var source)', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                color1: gold;
                            }
                            .c { color:green; }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./base-theme.st.css";
                                -st-named: color1;
                            }
                            .b { color:value(color1); }
                        `
                    },
                    '/base-theme.st.css': {
                        namespace: 'base-theme',
                        content: `
                            :vars {
                                color1:red;
                            }
                            .a { color:value(color1); }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.base-theme--root .base-theme--a { color:red; }',
                '.entry--root .base-theme--a { color:gold; }',

                '.theme--root .theme--b { color:red; }',
                '.entry--root .theme--b { color:gold; }',

                '.entry--root .entry--c { color:green; }'
            ].join('\n'));
        });

        it('should override import as vars', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                colorX: gold;
                            }
                            .c { color:green; }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./base-theme.st.css";
                                -st-named: color1 as colorX;
                            }
                            .b { color:value(colorX); }
                        `
                    },
                    '/base-theme.st.css': {
                        namespace: 'base-theme',
                        content: `
                            :vars {
                                color1:red;
                            }
                            .a { color:value(color1); }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.base-theme--root .base-theme--a { color:red; }',
                '.entry--root .base-theme--a { color:gold; }',

                '.theme--root .theme--b { color:red; }',
                '.entry--root .theme--b { color:gold; }',

                '.entry--root .entry--c { color:green; }'
            ].join('\n'));
        });

        it('should override value(var)', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                color1: gold;
                            }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :vars {
                                color1:red;
                                color2:value(color1)
                            }
                            .t { color:value(color1); border:value(color2); }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.theme--root .theme--t { color:red; border:red; }',
                '.entry--root .theme--t { color:gold; border:gold; }'
            ].join('\n'));
        });

        it('should resolve none overridden vars', () => {
            /**
             * this is a side effect of resolving overrides, where any value might be overridden
             * just because there is an override. need to see that normal imported vars are resolved correctly.
             */
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/comp.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                color2: silver;
                            }
                        `
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: `
                            :import {
                                -st-from: "./theme.st.css";
                                -st-named: color1, color2;
                            }
                            .c { color:value(color1); }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :vars {
                                color1:red;
                                color2:blue;
                            }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.comp--root .comp--c { color:red; }'
            ].join('\n'));
        });

        it('should add override CSS to none theme stylesheets using the overridden vars', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/comp.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                color1: gold;
                            }
                            .a { color:green; }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :vars {
                                color1:red;
                            }
                            .c { color:value(color1); }
                        `
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: `
                            :import {
                                -st-from: "./theme.st.css";
                                -st-named: color1;
                            }
                            .root { color:value(color1); }
                            .d { color:value(color1); }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.theme--root .theme--c { color:red; }',
                '.entry--root .theme--c { color:gold; }',

                '.comp--root { color:red; }',
                '.entry--root .comp--root { color:gold; }',
                '.comp--root .comp--d { color:red; }',
                '.entry--root .comp--root .comp--d { color:gold; }',

                '.entry--root .entry--a { color:green; }'
            ].join('\n'));
        });

        it('should add override CSS overridden in a nested theme', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/comp.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./base-theme.st.css";
                                color1: gold;
                            }
                            .a { color:green; }
                        `
                    },
                    '/base-theme.st.css': {
                        namespace: 'baseTheme',
                        content: `
                            :vars {
                                color1:red;
                            }
                            .c { color:value(color1); }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./base-theme.st.css";
                                -st-named: color1;
                            }
                        `
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: `
                            :import {
                                -st-from: "./theme.st.css";
                                -st-named: color1;
                            }
                            .d { color:value(color1); }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.baseTheme--root .baseTheme--c { color:red; }',
                '.entry--root .baseTheme--c { color:gold; }',

                '.comp--root .comp--d { color:red; }',
                '.entry--root .comp--root .comp--d { color:gold; }',

                '.entry--root .entry--a { color:green; }'
            ].join('\n'));
        });

        it('should add override to CSS effected from the override itself', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                -st-named: color1;
                                color1: gold;
                            }
                            .a { color:value(color1); }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :vars {
                                color1:red;
                            }
                            .b { color:value(color1); }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.theme--root .theme--b { color:red; }',
                '.entry--root .theme--b { color:gold; }',

                '.entry--root .entry--a { color:red; }',
                '.entry--root.entry--root .entry--a { color:gold; }' /* <-- */
            ].join('\n'));
        });

        it('should add override multiple theme using sheets', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/a.st.css',
                    '/b.st.css'
                ],
                files: {
                    '/a.st.css': {
                        namespace: 'a',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                -st-named: color1;
                                color1: gold;
                            }
                            .a { color:value(color1); }
                        `
                    },
                    '/b.st.css': {
                        namespace: 'b',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                -st-named: color1;
                                color1: silver;
                            }
                            .b { color:value(color1); }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :vars {
                                color1:red;
                            }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.b--root .b--b { color:red; }',
                '.a--root .b--root .b--b { color:gold; }',
                '.b--root.b--root .b--b { color:silver; }',

                '.a--root .a--a { color:red; }',
                '.a--root.a--root .a--a { color:gold; }',
                '.b--root .a--root .a--a { color:silver; }'
                /* ToDo: doesn't have any effect in any of our current use cases,
                but containers with theme might use something like this */
            ].join('\n'));
        });

        it('should add override entry to global classes (naive)', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                color1: gold;
                            }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :vars {
                                color1:green;
                            }
                            :global(.x) { color:value(color1); }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.x { color:green; }',
                '.entry--root .x { color:gold; }'
            ].join('\n'));
        });

        it('should output entry point override before sub entry override', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/sub-entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                color1: gold;
                            }
                            .a { color:green; }
                        `
                    },
                    '/sub-entry.st.css': {
                        namespace: 'subEntry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                color1: silver;
                            }
                            .b { color:green; }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                            :vars {
                                color1:red;
                            }
                            .x { color:value(color1); }
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.theme--root .theme--x { color:red; }',
                '.entry--root .theme--x { color:gold; }',
                '.subEntry--root .theme--x { color:silver; }',

                '.subEntry--root .subEntry--b { color:green; }',

                '.entry--root .entry--a { color:green; }'
            ].join('\n'));
        });

    });

    describe('cleanup', () => {

        it('should not remove ruleset imported from theme', () => {
            const cssOutput = generateStylableOutput({
                scopeRoot: true,
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-theme: true;
                                -st-from: "./theme.st.css";
                                -st-named: myClass;
                            }
                            .myClass { color:red; }
                        `
                    },
                    '/theme.st.css': {
                        namespace: 'theme',
                        content: `
                           .myClass {}
                        `
                    }
                }
            });

            expect(cssOutput).to.eql([
                '.theme--root .theme--myClass {}',
                '.entry--root .theme--myClass { color:red; }'
            ].join('\n'));

        });
    });
});
