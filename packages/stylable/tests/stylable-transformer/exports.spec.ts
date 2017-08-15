import { expect } from "chai";
import { generateStylableExports } from "../utils/generate-test-util";

describe('Exports', function () {

    it('contain root exports', function () {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: ``
                }
            }
        });


        expect(cssExports).to.eql({
            root: 'entry--root'
        });

    });

    
    it('contain local class exports', function () {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                "/entry.st.css": {
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

        
    it('contain local vars', function () {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                "/entry.st.css": {
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

    it('not contain imported vars', function () {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./imported.st.css";
                            -st-named: color1;
                        }
                       
                    `
                },
                "/imported.st.css": {
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

    it('not resolve imported vars value on exported var', function () {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                "/entry.st.css": {
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
                "/imported.st.css": {
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

    it('contain local keyframe', function () {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                "/entry.st.css": {
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


});
