import { expect } from 'chai';
import * as postcss from 'postcss';
import { generateStylableRoot } from '../utils/generate-test-util';

describe('Stylable postcss transform (Scoping)', () => {

    describe('scoped pseudo-elements', () => {

        it('component/tag selector that extends root with inner class targeting', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            Container::inner {}
                            Container::inner::deep {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .inner {
                                -st-extends: Deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.ns1--root .ns1--inner');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns1--root .ns1--inner .ns2--deep');
        });

        it('component/tag selector with custom states', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            Container:state {}

                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            .root {
                                -st-states: state;
                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.ns1--root[data-ns1-state]');

        });

        it('component/tag selector with -st-global', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            Container {}

                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            .root {
                                -st-global: ".x";
                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.x');
        });

        it('class selector that extends root with inner class targeting (deep)', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            .app {
                                -st-extends: Container;
                            }
                            .app::inner {}
                            .app::inner::deep {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .inner {
                                -st-extends: Deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns--app.ns1--root .ns1--inner');
            expect((result.nodes![2] as postcss.Rule).selector)
                .to.equal('.ns--app.ns1--root .ns1--inner .ns2--deep');

        });

        it('class selector that extends root uses pseudo-element after pseudo-class', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            .app {
                                -st-extends: Container;
                            }
                            .app:hover::inner {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./base.st.css";
                                -st-default: Base;
                            }
                            .root {
                                -st-extends: Base
                            }
                            .inner {

                            }
                        `
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .root {

                            }
                            .deep {

                            }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns--app.ns1--root:hover .ns1--inner');

        });

        it('resolve and transform pseudo-element from deeply extended type', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .app {
                                -st-extends: Inner;
                            }
                            .app::deep {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .root {
                                -st-extends: Deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns--app.ns1--root .ns2--deep');

        });

        it('resolve and transform pseudo-element from deeply override rather then extended type', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            .app {
                                -st-extends: Container;
                            }
                            .app::deep {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .root {
                                -st-extends: Deep;
                            }
                            .deep {}
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns--app.ns1--root .ns1--deep');

        });

        it('resolve and transform pseudo-element on root - prefer inherited element to override', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .root {
                                -st-extends: Inner;
                            }
                            .root::inner, .inner { }
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .inner {}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector)
                .to.equal('.entry--root.inner--root .inner--inner, .entry--inner');

        });

        it('resolve and transform pseudo-element with -st-global output', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            Inner {}
                            Inner::a {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .root { -st-global: ".x";}
                            .a { -st-global: ".y";}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.x');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.x .y');

        });

        it('should work with nested pseudo selectors', () => {
            const result = generateStylableRoot({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .container {
                                 -st-states: state;
                            }
                            .container:state {
                                background: green;
                            }
                            .container:not(:state) {
                                background: red;
                            }
                        `
                    }
                }
            });
            expect((result.nodes![2] as postcss.Rule).selector)
                .to.equal('.entry--container:not([data-entry-state])');
        });
        // TODO: IDO create a bug report.
        // it('should work with nested pseudo selectors under pseudo element', () => {
        //     var result = generateStylableRoot({
        //         entry: '/entry.st.css',
        //         usedFiles: [
        //             '/entry.st.css'
        //         ],
        //         files: {
        //             '/entry.st.css': {
        //                 namespace: 'entry',
        //                 content: `
        //                     .list {
        //                         -st-elements: list-item;
        //                     }
        //                     .list-item {
        //                         -st-states: list-item-selected;
        //                         background: green;
        //                     }
        //                     .list::list-item:not(:list-item-selected) {
        //                         background: red;
        //                     }
        //                 `
        //             }
        //         }
        //     });
        //     expect((<postcss.Rule>result.nodes![2]).selector)
        //          .to.equal('.entry--root .entry--list .entry--list-item:not([data-entry-list-item-selected])');
        // })

        it('using nested pseudo selectors for pseudo elements', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            Container::item:not(:selected) {
                                background: yellow;
                            }
                            Container::item:selected {
                                background: purple;
                            }
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            .item {
                                -st-states: selected;
                                background: red;
                            }
                        `
                    }
                }
            });
            expect((result.nodes![0] as postcss.Rule).selector)
                .to.equal('.ns1--root .ns1--item:not([data-ns1-selected])');
            expect((result.nodes![1] as postcss.Rule).selector)
                .to.equal('.ns1--root .ns1--item[data-ns1-selected]');
        });

        it('resolve extend on extended alias', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            Inner::deep::up { }
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'Inner',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: deep;
                            }
                            .deep {
                                -st-extends: deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'Deep',
                        content: `
                            .root {}
                            .up{}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector)
                .to.equal('.Inner--root .Inner--deep .Deep--up');
        });

    });

    describe('scoped classes', () => {

        it('scope local classes', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .a {}
                            .b, .c {}
                            .d .e {}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.entry--a');
            expect((result.nodes![1] as postcss.Rule).selector)
                .to.equal('.entry--b, .entry--c');
            expect((result.nodes![2] as postcss.Rule).selector).to.equal('.entry--d .entry--e');

        });

        it('scope local root class', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {}
                            .root .a {}
                            .root .b, .c{}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.entry--root');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.entry--root .entry--a');
            expect((result.nodes![2] as postcss.Rule).selector)
                .to.equal('.entry--root .entry--b, .entry--c');

        });

        it('scope according to -st-global', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                -st-global: ".x";
                            }
                            .a {
                                -st-global: ".y";
                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.x');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.y');

        });

        it('scope according to -st-global complex chunk', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                -st-global: ".x.y";
                            }
                            .a {
                                -st-global: ".z";
                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.x.y');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.z');

        });

        it('scope selector that extends local root', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .a {
                                -st-extends: root;
                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.entry--a.entry--root');

        });

        it.skip('TODO: fix it. scope selector that extends local root', () => {

            generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .a, .b {
                                -st-extends: root;
                            }
                        `
                    }
                }
            });

        });

        it('scope selector that extends anther style', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-default: Imported;
                            }
                            .a {
                                -st-extends: Imported;
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: ''
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.entry--a.imported--root');

        });

        it('scope selector that extends a style with -st-global root', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-default: Imported;
                            }
                            .a {
                                -st-extends: Imported;
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .root {
                                -st-global: ".x";
                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.entry--a.x');

        });

        it('scope class alias', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-default: Imported;
                                -st-named: inner-class;
                            }

                            .Imported{}
                            .inner-class{}
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .inner-class {

                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector, 'root alias').to.equal('.imported--root');
            expect((result.nodes![1] as postcss.Rule).selector, 'class alias')
                .to.equal('.imported--inner-class');

        });

        it('scope class alias that also extends', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-default: Imported;
                                -st-named: inner-class;
                            }
                            .inner-class{
                                -st-extends: inner-class
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .inner-class {

                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector, 'class alias')
                .to.equal('.entry--inner-class.imported--inner-class');

        });

        it('scope class alias that extends and have pseudo elements ', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-named: inner-class;
                            }

                            .inner-class::base {

                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            :import{
                                -st-from: "./base.st.css";
                                -st-default: Base;
                            }
                            .inner-class {
                                -st-extends: Base;
                            }
                        `
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .base {

                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector, 'class alias')
                .to.equal('.imported--inner-class .base--base');

        });

        it('scope selector that extends local class', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            .a {

                            }
                            .b {
                                -st-extends: a;
                            }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns--b.ns--a');

        });

        it('extends class form imported sheet', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-named: b;
                            }
                            .a {
                                -st-extends: b;
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: `
                        .b {

                        }
                    `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.ns--a.ns1--b');

        });

        it('handle not existing imported class', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-named: b;
                            }
                            .b {}
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: `

                    `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.ns--b');

        });

    });

    describe('scoped states', () => {

        it('custom states inline', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .my-class {
                                -st-states: my-state;
                            }
                            .my-class:my-state {}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector)
                .to.equal('.entry--my-class[data-entry-my-state]');

        });

        it('custom states with mapping', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .my-class {
                                -st-states: my-state('.x'), my-other-state("  .y[data-z=\\"value\\"]  ");
                            }
                            .my-class:my-state {}
                            .my-class:my-other-state {}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.entry--my-class.x');
            expect((result.nodes![2] as postcss.Rule).selector)
                .to.equal('.entry--my-class.y[data-z="value"]');

        });

        it('custom states with focus-within', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                -st-states: open(":not(:focus-within):not(:hover)");
                            }
                            .root:open {

                            }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.entry--root:not(:focus-within):not(:hover)');

        });

        it('custom states lookup order', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .my-class {
                                -st-states: my-state;
                                -st-extends: Inner;
                            }
                            .my-class:my-state {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .root {
                                -st-states: my-state;
                            }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector)
                .to.equal('.entry--my-class.inner--root[data-entry-my-state]');

        });

        it('custom states from imported type', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .my-class {
                                -st-extends: Inner;
                            }
                            .my-class:my-state {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .root {
                                -st-states: my-state;
                            }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector)
                .to.equal('.entry--my-class.inner--root[data-inner-my-state]');

        });

        it('custom states from deep imported type', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .my-class {
                                -st-extends: Inner;
                            }
                            .my-class:my-state {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .root {
                                -st-extends: Deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'deep',
                        content: `
                            .root {
                                -st-states: my-state;
                            }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector)
                .to.equal('.entry--my-class.inner--root[data-deep-my-state]');

        });

        it('custom states form imported type on inner pseudo-class', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .my-class {
                                -st-extends: Inner;
                            }
                            .my-class::container:my-state {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .container {
                                -st-states: my-state;
                            }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector)
                .to.equal('.entry--my-class.inner--root .inner--container[data-inner-my-state]');

        });

        it('custom states form imported type on inner pseudo-class deep', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .my-class {
                                -st-extends: Inner;
                            }
                            .my-class::container:my-state {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .root {

                            }
                            .container {
                                -st-extends: Deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'deep',
                        content: `
                            .root {
                                -st-states: my-state;
                            }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector)
                .to.equal('.entry--my-class.inner--root .inner--container[data-deep-my-state]');

        });

    });

    describe('@media scoping', () => {

        it('handle scoping inside media queries', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            @media (max-width: 300px) {
                                .my-class {
                                    -st-states: my-state;
                                }
                                .my-class:my-state {}
                            }
                        `
                    }
                }
            });

            const mediaNode = result.nodes![0] as postcss.AtRule;

            expect((mediaNode.nodes![0] as postcss.Rule).selector)
                .to.equal('.entry--my-class');
            expect((mediaNode.nodes![1] as postcss.Rule).selector)
                .to.equal('.entry--my-class[data-entry-my-state]');

        });

    });

    describe('@keyframes scoping', () => {
        it('scope animation and animation name', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            @keyframes name {
                                from {}
                                to {}
                            }

                            @keyframes name2 {
                                from {}
                                to {}
                            }

                            .selector {
                                animation: 2s name infinite, 1s name2 infinite;
                                animation-name: name;
                            }

                        `
                    }
                }
            });
            expect((result.nodes![0] as postcss.AtRule).params).to.equal('entry--name');
            expect((result.nodes![1] as postcss.AtRule).params).to.equal('entry--name2');
            expect((result.nodes![2] as postcss.Rule).nodes![0].toString())
                .to.equal('animation: 2s entry--name infinite, 1s entry--name2 infinite');
            expect((result.nodes![2] as postcss.Rule).nodes![1].toString())
                .to.equal('animation-name: entry--name');

        });

        it('not scope rules that are child of keyframe atRule', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            @keyframes name {
                                from {}
                                to {}
                            }
                            @keyframes name2 {
                                0% {}
                                100% {}
                            }
                        `
                    }
                }
            });

            const at = result.nodes![0] as postcss.AtRule;
            expect((at.nodes![0] as postcss.Rule).selector).to.equal('from');
            expect((at.nodes![1] as postcss.Rule).selector).to.equal('to');

            const at1 = result.nodes![1] as postcss.AtRule;
            expect((at1.nodes![0] as postcss.Rule).selector).to.equal('0%');
            expect((at1.nodes![1] as postcss.Rule).selector).to.equal('100%');

        });

    });

});
