import {expect} from 'chai';
import {createTestBundler, generateStylableOutput} from '../utils/generate-test-util';

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

    it('should support unresolveable vars', () => {

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

    it('should not output selectors which contain unused files roots', () => {
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
                    content: `
                        .root { color:red; }
                    `
                }
            }

        });

        expect(output).to.eql([
            `.entry--c { color:gold; }`
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
