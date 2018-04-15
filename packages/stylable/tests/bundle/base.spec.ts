import { expect } from 'chai';
import { createTestBundler, generateStylableOutput } from '../utils/generate-test-util';

describe('bundle: base', () => {

    it('should output used file as css bundle', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        .b { color:green; }
                    `
                }
            }
        });

        expect(output).to.eql(`.entry--b { color:green; }`);
    });

    it('should handle unresolved named imports', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./theme.st.css";
                            -st-named: NAME;
                        }
                        .b { color:green; }
                    `
                },
                '/theme.st.css': {
                    namespace: 'theme',
                    content: ``
                }
            }
        });

        expect(output).to.eql(`.entry--b { color:green; }`);
    });

    it('should output according to import order (entry strongest - bottom of CSS)', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css',
                '/comp.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        .a { color:red; }
                    `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        .b { color:green; }
                    `
                }
            }
        });

        expect(output).to.eql([
            `.comp--b { color:green; }`,

            `.entry--a { color:red; }`
        ].join('\n'));
    });

    it('should ignore js imports', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: './script';
                            -st-default: scriptExport;
                        }
                        .b { color:green; }
                    `
                },
                '/script.js': {
                    content: ``
                }
            }
        });

        expect(output).to.eql(`.entry--b { color:green; }`);
    });

    it('should not output unused file', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        .a { color:gold; }
                    `
                },
                '/unused-comp.st.css': {
                    namespace: 'unusedComp',
                    content: `
                        .c { color:red; }
                    `
                }
            }

        });

        expect(output).to.eql([
            `.entry--a { color:gold; }`
        ].join('\n'));
    });

    it('should output selectors which contain used files roots', () => {
        const output = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css',
                '/used-comp.st.css'
            ],
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: './used-comp.st.css';
                            -st-default: UsedComp;
                        }
                        UsedComp { color: red; }
                        .a {
                            -st-extends: UsedComp;
                            color: green;
                        }
                        .b.a { color: blue; }
                        .b UsedComp { color: black; }
                    `
                },
                '/used-comp.st.css': {
                    namespace: 'usedComp',
                    content: `
                        .root { color: red; }
                    `
                }
            }

        });

        expect(output).to.eql([
            `.usedComp--root { color: red; }`,

            `.usedComp--root { color: red; }`,
            `.entry--a.usedComp--root {\n    -st-extends: UsedComp;\n    color: green;\n}`,
            `.entry--b.entry--a.usedComp--root { color: blue; }`,
            `.entry--b .usedComp--root { color: black; }`
        ].join('\n'));
    });

    it('should handle circular dependencies', () => {
        let output = null;

        expect(() => {
            output = generateStylableOutput({
                entry: '/entry-a.st.css',
                usedFiles: [
                    '/entry-a.st.css',
                    '/entry-b.st.css'
                ],
                files: {
                    '/entry-a.st.css': {
                        namespace: 'entryA',
                        content: `
                            :import {
                                -st-from: "./entry-b.st.css";
                                -st-default: EntryB;
                            }
                            EntryB { color: red; }
                        `
                    },
                    '/entry-b.st.css': {
                        namespace: 'entryB',
                        content: `
                            :import {
                                -st-from: "./entry-a.st.css";
                                -st-default: EntryA;
                            }
                            EntryA { color: green; }
                        `
                    }
                }
            });
        }).not.to.throw();

        expect(output).to.eql([
            `.entryA--root { color: green; }`,

            `.entryB--root { color: red; }`
        ].join('\n'));
    });

    describe('rule shaking', () => {

        it('should remove rules with selectors which reference unused stylesheets', () => {
            const output = generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: './unused-comp.st.css';
                                -st-default: UnusedComp;
                            }
                            UnusedComp { color: red; }
                            .a {
                                -st-extends: UnusedComp;
                                color: green;
                            }
                            .b.a { color: blue; }
                            .b UnusedComp { color: black; }

                            .c { color:gold; }
                        `
                    },
                    '/unused-comp.st.css': {
                        namespace: 'unusedComp',
                        content: ``
                    }
                }

            });

            expect(output).to.eql([
                `.entry--c { color:gold; }`
            ].join('\n'));
        });

        it('should remove just the unused selector and keep the rule if it has other used selectors', () => {
            const output = generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: './unused-comp.st.css';
                                -st-default: UnusedComp;
                            }
                            UnusedComp, .usedClass { color: red; }
                        `
                    },
                    '/unused-comp.st.css': {
                        namespace: 'unusedComp',
                        content: ``
                    }
                }

            });

            expect(output).to.eql([
                `.entry--usedClass { color: red; }`
            ].join('\n'));
        });

        it('should keep selectors which extends an edge used file', () => {
            const output = generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/used.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: './index.st.css';
                                -st-named: Used, Unused;
                            }
                            Used { color: blue; }
                            Unused { color: blackest; }
                        `
                    },
                    '/index.st.css': {
                        namespace: 'index',
                        content: `
                            :import {
                                -st-from: './used.st.css';
                                -st-default: Used;
                            }
                            :import {
                                -st-from: './unused.st.css';
                                -st-default: Unused;
                            }
                            Used { }
                            Unused { }
                        `
                    },
                    '/used.st.css': {
                        namespace: 'used',
                        content: `
                            .root { color: red; }
                        `
                    },
                    '/unused.st.css': {
                        namespace: 'unused',
                        content: `
                            .root { color: black; }
                        `
                    }
                }

            });

            expect(output).to.eql([
                `.used--root { color: red; }`,
                `.used--root { color: blue; }`
            ].join('\n'));
        });

        it.skip('should include selectors from "non used" (from js) files that are used in css', () => {
            const output = generateStylableOutput({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css',
                    '/used.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: './index.st.css';
                                -st-named: Used, Unused;
                            }
                            Used { color: blue; }
                            Unused { color: blackest; }
                        `
                    },
                    '/index.st.css': {
                        namespace: 'index',
                        content: `
                            :import {
                                -st-from: './used.st.css';
                                -st-default: Used;
                            }
                            :import {
                                -st-from: './unused.st.css';
                                -st-default: Unused;
                            }
                            Used { color: green; }
                            Unused { color: blacker; }
                        `
                    },
                    '/used.st.css': {
                        namespace: 'used',
                        content: `
                            .root { color: red; }
                        `
                    },
                    '/unused.st.css': {
                        namespace: 'unused',
                        content: `
                            .root { color: black; }
                        `
                    }
                }

            });

            expect(output).to.eql([
                `.used--root { color: red; }`,
                `.used--root { color: green; }`,
                `.used--root { color: blue; }`
            ].join('\n'));
        });


        it('should keep selectors that used in 3rd party modules', () => {
            const output = generateStylableOutput({
                entry: '/entry.st.css',
                resolve: {
                    symlinks: false,
                    alias: {
                        components: '/node_modules/components'
                    }
                },
                usedFiles: [
                    '/entry.st.css',
                    '/node_modules/components/used.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: 'components/index.st.css';
                                -st-named: Used, Unused;
                            }
                            Used { color: blue; }
                            Unused { color: blackest; }
                        `
                    },
                    '/node_modules/components/package.json': {
                        content: `{"name": "components"}`
                    },
                    '/node_modules/components/index.st.css': {
                        namespace: 'index',
                        content: `
                            :import {
                                -st-from: './used.st.css';
                                -st-default: Used;
                            }
                            :import {
                                -st-from: './unused.st.css';
                                -st-default: Unused;
                            }
                            Used { }
                            Unused { }
                        `
                    },
                    '/node_modules/components/used.st.css': {
                        namespace: 'used',
                        content: `
                            .root { color: red; }
                        `
                    },
                    '/node_modules/components/unused.st.css': {
                        namespace: 'unused',
                        content: `
                            .root { color: black; }
                        `
                    }
                }

            });

            expect(output).to.eql([
                `.used--root { color: red; }`,
                `.used--root { color: blue; }`
            ].join('\n'));
        });

        it('resolve states from imported elements through 3rd party index', () => {
            const output = generateStylableOutput({
                entry: '/entry.st.css',
                resolve: {
                    symlinks: false,
                    alias: {
                        components: '/node_modules/components'
                    }
                },
                usedFiles: [
                    '/entry.st.css',
                    '/node_modules/components/used.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: 'components/index.st.css';
                                -st-named: Used;
                            }
                            .root {-st-extends: Used;}
                            .root:error {color: red;}
                        `
                    },
                    '/node_modules/components/package.json': {
                        content: `{"name": "components"}`
                    },
                    '/node_modules/components/index.st.css': {
                        namespace: 'index',
                        content: `
                            :import {
                                -st-from: './used.st.css';
                                -st-default: Used;
                            }
                            Used { }
                        `
                    },
                    '/node_modules/components/used.st.css': {
                        namespace: 'used',
                        content: `
                            .root {-st-states: error;}
                        `
                    }
                }

            });


            const expected = [`.used--root {-st-states: error;}`,
                `.entry--root.used--root {-st-extends: Used;}`,
                `.entry--root.used--root[data-used-error] {color: red;}`];

            expect(output).to.eql(expected.join('\n'));
        });

    });

    describe('specific used files', () => {

        it('should be output from larger collection', () => {
            const bundler = createTestBundler({
                entry: '',
                usedFiles: [],
                files: {
                    '/entry-a.st.css': {
                        namespace: 'entryA',
                        content: `
                        .a { color:red; }
                        `
                    },
                    '/entry-b.st.css': {
                        namespace: 'entryB',
                        content: `
                        .b { color:green; }
                        `
                    }
                }
            });

            bundler.addUsedFile('/entry-a.st.css');
            bundler.addUsedFile('/entry-b.st.css');

            const entryA_output = bundler.generateCSS(['/entry-a.st.css']);
            const entryB_output = bundler.generateCSS(['/entry-b.st.css']);

            expect(entryA_output).to.eql([
                `.entryA--a { color:red; }`
            ].join('\n'));
            expect(entryB_output).to.eql([
                `.entryB--b { color:green; }`
            ].join('\n'));
        });

        it('should be output with relevent theme', () => {
            const bundler = createTestBundler({
                entry: '',
                usedFiles: [],
                files: {
                    '/entry-a.st.css': {
                        namespace: 'entryA',
                        content: `
                        .a { color:red; }
                        `
                    },
                    '/entry-b.st.css': {
                        namespace: 'entryB',
                        content: `
                        .b { color:green; }
                        `
                    }
                }
            });

            bundler.addUsedFile('/entry-a.st.css');
            bundler.addUsedFile('/entry-b.st.css');

            const entryA_output = bundler.generateCSS(['/entry-a.st.css']);
            const entryB_output = bundler.generateCSS(['/entry-b.st.css']);

            expect(entryA_output).to.eql([
                `.entryA--a { color:red; }`
            ].join('\n'));
            expect(entryB_output).to.eql([
                `.entryB--b { color:green; }`
            ].join('\n'));
        });

    });

});
