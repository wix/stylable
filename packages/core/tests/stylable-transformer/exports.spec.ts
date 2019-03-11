import { generateStylableExports } from '@stylable/core-test-kit';
import { expect } from 'chai';

describe('Exports to js', () => {
    describe('classes', () => {
        it('contain root exports', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: ``
                    }
                }
            });

            expect(cssExports.classes).to.eql({
                root: 'entry__root'
            });
        });

        it('contain local class exports', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .classA {}
                            .classB {}
                        `
                    }
                }
            });

            expect(cssExports.classes).to.eql({
                root: 'entry__root',
                classA: 'entry__classA',
                classB: 'entry__classB'
            });
        });

        it('do not contain global class exports', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :global(.classA) {}
                        `
                    }
                }
            });

            expect(cssExports.classes).to.eql({
                root: 'entry__root'
            });
        });

        it('not contain imported class', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: my-class;
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .my-class {}
                        `
                    }
                }
            });

            expect(cssExports.classes).to.eql({
                root: 'entry__root'
            });
        });

        it('contain used imported class', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: my-class;
                            }
                            .my-class{}
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .my-class {}
                        `
                    }
                }
            });

            expect(cssExports.classes).to.eql({
                'root': 'entry__root',
                'my-class': 'imported__my-class'
            });
        });

        it('not contain imported class when only extended and compose it into the existing class', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: my-class;
                            }
                            .local-class {
                                -st-extends: my-class;
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .my-class {}
                        `
                    }
                }
            });

            expect(cssExports.classes).to.eql({
                'root': 'entry__root',
                'local-class': 'entry__local-class imported__my-class'
            });
        });

        it('export alias imported from more then one level', () => {

            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./index.st.css";
                                -st-named: my-class;
                            }
                            .my-class {}
                        `
                    },
                    '/index.st.css': {
                        namespace: 'index',
                        content: `
                            :import {
                                -st-from: "./project.st.css";
                                -st-named: my-class;
                            }
                            .my-class {}
                        `
                    },
                    '/project.st.css': {
                        namespace: 'project',
                        content: `
                            .my-class {}
                        `
                    }
                }
            });

            expect(cssExports.classes['my-class']).to.equal('project__my-class');

        });

        it('should not export an element', () => {

            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./index.st.css";
                                -st-named: Elm;
                            }
                            Elm {}
                        `
                    },
                    '/index.st.css': {
                        namespace: 'index',
                        content: `
                            :import {
                                -st-from: "./elm.st.css";
                                -st-default: Elm;
                            }
                            Elm {}
                        `
                    }
                }
            });
            expect(cssExports.classes.Elm).to.equal(undefined);

        });
    });

    describe('stylable vars', () => {
        it('contain local vars', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :vars {
                                color1: red;
                            }
                            `
                    }
                }
            });

            expect(cssExports.stVars).to.eql({
                color1: 'red'
            });
        });

        it('not contain imported vars', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: color1;
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            :vars {
                                color1: red;
                            }
                        `
                    }
                }
            });

            expect(cssExports.stVars).to.eql({});
        });

        it('not resolve imported vars value on exported var', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: color1;
                            }
                            :vars {
                                color2: value(color1);
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            :vars {
                                color1: red;
                            }
                        `
                    }
                }
            });

            expect(cssExports.stVars).to.eql({
                color2: 'red'
            });
        });
    });

    describe('keyframes', () => {
        it('contain local keyframe', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            @keyframes name {

                            }
                        `
                    }
                }
            });

            expect(cssExports.keyframes).to.eql({
                name: 'entry__name'
            });
        });
    });

    describe('css vars', () => {
        it('exports native css vars defined locally', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                --myVar: green;
                            }
                            `
                    }
                }
            });

            expect(cssExports.vars).to.eql({
                '--myVar': '--entry-myVar'
            });
        });

        it('re-exports imported native css vars defined in a different stylesheet', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: --myVar;
                            }
                            `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .root {
                                --myVar: green;
                            }
                            `
                    }
                }
            });

            expect(cssExports.vars).to.eql({
                '--myVar': '--imported-myVar'
            });
        });

        it('exports css vars from mixed local and imported stylesheets with multiple levels', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./mid.st.css";
                                -st-named: --midVar, --baseVar;
                            }
                            .root {
                                --topVar: blue;
                            }
                            `
                    },
                    '/mid.st.css': {
                        namespace: 'mid',
                        content: `
                            :import {
                                -st-from: "./base.st.css";
                                -st-named: --baseVar;
                            }
                            .root {
                                --midVar: green;
                            }
                            `
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .root {
                                --baseVar: red;
                            }
                            `
                    }
                }
            });

            expect(cssExports.vars).to.eql({
                '--baseVar': '--base-baseVar',
                '--midVar': '--mid-midVar',
                '--topVar': '--entry-topVar'
            });
        });

        it('exports from mixed local and imported stylesheets with scoped and global css vars', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: --importedGlobal1, --importedGlobal2, --importedScoped1, --importedScoped2;
                            }

                            @st-global-custom-property --localGlobal1, --localGlobal2;

                            .root {
                                --localScoped1: 5;
                                --localScoped2: 6;
                                --localGlobal1: 7;
                                --localGlobal2: 8;
                            }
                            `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            @st-global-custom-property --importedGlobal1, --importedGlobal2;

                            .root {
                                --importedScoped1: 1;
                                --importedScoped2: 2;
                                --importedGlobal1: 3;
                                --importedGlobal2: 4;
                            }
                            `
                    }
                }
            });

            expect(cssExports.vars).to.eql({
                '--localScoped1': '--entry-localScoped1',
                '--localScoped2': '--entry-localScoped2',
                '--localGlobal1': '--localGlobal1',
                '--localGlobal2': '--localGlobal2',
                '--importedScoped1': '--imported-importedScoped1',
                '--importedScoped2': '--imported-importedScoped2',
                '--importedGlobal1': '--importedGlobal1',
                '--importedGlobal2': '--importedGlobal2'
            });
        });
    });

    describe('complex example', () => {
        it('with classes, vars, st-vars, and keyframes', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :vars {
                                stVar: green;
                            }

                            @keyframes name {

                            }

                            .root {
                                --cssVar: blue;
                            }
                            .part {}
                            `
                    }
                }
            });

            expect(cssExports).to.eql({
                classes: {
                    root: 'entry__root',
                    part: 'entry__part'
                },
                vars: {
                    '--cssVar': '--entry-cssVar'
                },
                stVars: {
                    stVar: 'green'
                },
                keyframes: {
                    name: 'entry__name'
                }
            });
        });
    });
});
