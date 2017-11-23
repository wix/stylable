import { expect } from 'chai';
// import * as postcss from "postcss";
import { generateStylableExports } from '../utils/generate-test-util';

describe('Theme', () => {

    it('should compose import root into root class', () => {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-theme: true;
                            -st-from: "./theme.st.css";
                        }
                    `
                },
                '/theme.st.css': {
                    namespace: 'theme',
                    content: ``
                }
            }
        });

        expect(cssExports).to.eql({
            root: 'entry--root theme--root'
        });

    });

    it('should compose import root into root class (multi level)', () => {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-theme: true;
                            -st-from: "./theme.st.css";
                        }
                    `
                },
                '/theme.st.css': {
                    namespace: 'theme',
                    content: `
                        :import {
                            -st-theme: true;
                            -st-from: "./inner-theme.st.css";
                        }
                    `
                },
                '/inner-theme.st.css': {
                    namespace: 'inner-theme',
                    content: ``
                }
            }
        });

        expect(cssExports).to.eql({
            root: 'entry--root theme--root inner-theme--root'
        });

    });

});
