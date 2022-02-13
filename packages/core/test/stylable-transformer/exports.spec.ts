import { expect } from 'chai';
import { generateStylableExports } from '@stylable/core-test-kit';

describe('Exports to js', () => {
    describe('classes', () => {
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
                        `,
                    },
                    '/index.st.css': {
                        namespace: 'index',
                        content: `
                            :import {
                                -st-from: "./elm.st.css";
                                -st-default: Elm;
                            }
                            Elm {}
                        `,
                    },
                },
            });
            expect(cssExports.classes.Elm).to.equal(undefined);
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
                        `,
                    },
                    '/middle.st.css': {
                        namespace: 'middle',
                        content: `
                            .x {
                            }
                            .x .y {}
                        `,
                    },
                },
            });
            expect(cssExports.classes).to.eql({
                root: 'entry__root',
                z: 'entry__z',
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
                            @keyframes name {}
                            .root {}
                            .part {}
                            `,
                    },
                },
            });

            expect(cssExports).to.eql({
                classes: {
                    root: 'entry__root',
                    part: 'entry__part',
                },
                vars: {},
                stVars: {},
                keyframes: {
                    name: 'entry__name',
                },
            });
        });
    });
});
