import { expect } from 'chai';
// import * as postcss from "postcss";
import { generateStylableExports } from '../utils/generate-test-util';

describe('Exports (Compose)', () => {

    it('should compose class into another class or tag', () => {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        .a {}
                        .b {
                            -st-compose: a;
                        }
                    `
                }
            }
        });

        expect(cssExports).to.eql({
            root: 'entry--root',
            a: 'entry--a',
            b: 'entry--b entry--a'
        });

    });

    it('should compose imported class into class', () => {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./inner.st.css";
                            -st-named: b;
                        }
                        .a {
                            -st-compose: b;
                        }
                    `
                },
                '/inner.st.css': {
                    namespace: 'inner',
                    content: `
                        :import {
                            -st-from: "./deep.st.css";
                            -st-named: c;
                        }
                        .b {
                            -st-compose: c;
                        }
                    `
                },
                '/deep.st.css': {
                    namespace: 'deep',
                    content: `
                        .c {}
                    `
                }
            }
        });

        expect(cssExports).to.eql({
            root: 'entry--root',
            a: 'entry--a inner--b deep--c'
        });

    });

    it('should report when composing on anything but simple css selector and ignore', () => {
        // TODO: test it
    });

    it('should report if composing class to itself and ignore', () => {
        // TODO: test it
    });

    it('should support multiple compose values', () => {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        .a {}
                        .b {}
                        .c {
                            -st-compose: a, b;
                        }
                    `
                }
            }
        });

        expect(cssExports).to.eql({
            root: 'entry--root',
            a: 'entry--a',
            b: 'entry--b',
            c: 'entry--c entry--a entry--b'
        });
    });

    describe('compose by extends', () => {

        it('compose when extending class that is not root', () => {

            const cssExports = generateStylableExports({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        .a{}
                        .b{
                            -st-extends: a;
                        }
                    `
                    }
                }
            });

            expect(cssExports).to.eql({
                root: 'entry--root',
                a: 'entry--a',
                b: 'entry--b entry--a'
            });

        });

    });

});
