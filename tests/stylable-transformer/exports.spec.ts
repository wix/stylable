import { expect } from 'chai';
import { generateStylableExports } from '../utils/generate-test-util';

describe('Exports', () => {

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

        expect(cssExports).to.eql({
            root: 'entry--root'
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

        expect(cssExports).to.eql({
            root: 'entry--root',
            classA: 'entry--classA',
            classB: 'entry--classB'
        });

    });

    it('not contain global class exports', () => {

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

        expect(cssExports).to.eql({
            root: 'entry--root'
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

        expect(cssExports).to.eql({
            root: 'entry--root'
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

        expect(cssExports).to.eql({
            'root': 'entry--root',
            'my-class': 'imported--my-class'
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

        expect(cssExports).to.eql({
            'root': 'entry--root',
            'local-class': 'entry--local-class imported--my-class'
        });

    });

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

        expect(cssExports).to.eql({
            root: 'entry--root',
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

        expect(cssExports).to.eql({
            root: 'entry--root'
        });

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

        expect(cssExports).to.eql({
            root: 'entry--root',
            color2: 'red'
        });

    });

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

        expect(cssExports).to.eql({
            root: 'entry--root',
            name: 'entry--name'
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

        expect(cssExports['my-class']).to.equal('project--my-class');

    });


});
