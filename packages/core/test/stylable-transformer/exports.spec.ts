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
                root: 'entry__root',
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
                root: 'entry__root',
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

        it('should handle root extends root', () => {
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
                            .root {
                                -st-extends: Elm; 
                            }
                        `
                    },
                    '/index.st.css': {
                        namespace: 'index',
                        content: `
                        `
                    }
                }
            });
            expect(cssExports.classes.root).to.equal('entry__root');
        });
        
        it('should handle root extends local class', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                -st-extends: y; 
                            }
                            .y {}
                        `
                    }
                }
            });
            expect(cssExports.classes.root).to.equal('entry__root entry__y');
        });
        
        it('should handle root extends imported class', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./index.st.css";
                                -st-named: y;
                            }
                            .root {
                                -st-extends: y; 
                            }
                        `
                    },
                    '/index.st.css': {
                        namespace: 'index',
                        content: `
                            .y{}
                        `
                    }
                }
            });
            expect(cssExports.classes.root).to.equal('entry__root index__y');
        });
        
        it('should handle root extends imported class alias', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./alias.st.css";
                                -st-named: y;
                            }
                            .root {
                                -st-extends: y; 
                            }
                        `
                    },
                    '/alias.st.css': {
                        namespace: 'alias',
                        content: `
                            :import {
                                -st-from: "./index.st.css";
                                -st-named: y;
                            }

                            .y{}
                        `
                    },
                    '/index.st.css': {
                        namespace: 'index',
                        content: `
                            .y{}
                        `
                    }
                }
            });
            expect(cssExports.classes.root).to.equal('entry__root index__y');
        });
        
        it('should handle multiple extends levels', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./middle.st.css";
                                -st-named: x;
                            }
                            .root {
                                -st-extends: x; 
                            }
                        `
                    },
                    '/middle.st.css': {
                        namespace: 'middle',
                        content: `
                            :import {
                                -st-from: "./index.st.css";
                                -st-named: y;
                            }

                            .x{
                                -st-extends: y;
                            }
                        `
                    },
                    '/index.st.css': {
                        namespace: 'index',
                        content: `
                            .y{}
                        `
                    }
                }
            });
            expect(cssExports.classes.root).to.equal('entry__root middle__x index__y');
        });

        it('should handle multiple levels of extending with a local class', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./base.st.css";
                                -st-default: Comp;
                            }
                            .local {
                                -st-extends: Comp; 
                            }
                            .extending {
                                -st-extends: local;
                            }
                        `
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .root {}
                        `
                    }
                }
            });
            expect(cssExports.classes.extending).to.equal('entry__extending entry__local');
        });
        
        it('should handle classes from mixins', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./middle.st.css";
                                -st-named: x;
                            }

                            .root {
                                -st-mixin: x; 
                            }
                            .z { 
                                -st-mixin: x; 
                            }
                        `
                    },
                    '/middle.st.css': {
                        namespace: 'middle',
                        content: `
                            .x {
                            }
                            .x .y {}
                        `
                    }
                }
            });
            expect(cssExports.classes).to.eql({
                root: 'entry__root',
                z: 'entry__z'
            });
        });
        
    });

    describe('stylable vars', () => {
        it('contains local vars', () => {
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

        it('should not contain imported vars', () => {
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

        it('should not resolve imported vars value on exported var', () => {
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

        it('should export custom values using their data structure', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :vars {
                                myArray: stArray(1, 2, 3);
                                deepArray: stArray(1, stArray(2, 3), value(myArray));
                                object: stMap(x 1, y 2);
                                deepObject: stMap(x 1, y 2, z stMap(x 1, y 2));
                                mixed: stMap(x 1, y stArray(2, 3, stArray(4, stMap(z 5))));
                            }
                        `
                    }
                }
            });

            expect(cssExports.stVars).to.eql({
                myArray: ['1', '2', '3'],
                deepArray: ['1', ['2', '3'], ['1', '2', '3']],
                object: { x: '1', y: '2' },
                deepObject: { x: '1', y: '2', z: { x: '1', y: '2' } },
                mixed: { x: '1', y: ['2', '3', ['4', { z: '5' }]] }
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
                myVar: '--entry-myVar'
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
                myVar: '--imported-myVar'
            });
        });

        it('re-exports imported native css vars imported using "named as"', () => {
            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: --myVar as --renamed;
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
                renamed: '--imported-myVar'
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
                baseVar: '--base-baseVar',
                midVar: '--mid-midVar',
                topVar: '--entry-topVar'
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
                localScoped1: '--entry-localScoped1',
                localScoped2: '--entry-localScoped2',
                localGlobal1: '--localGlobal1',
                localGlobal2: '--localGlobal2',
                importedScoped1: '--imported-importedScoped1',
                importedScoped2: '--imported-importedScoped2',
                importedGlobal1: '--importedGlobal1',
                importedGlobal2: '--importedGlobal2'
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
                    cssVar: '--entry-cssVar'
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
