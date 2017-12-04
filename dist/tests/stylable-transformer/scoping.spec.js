"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var generate_test_util_1 = require("../utils/generate-test-util");
describe('Stylable postcss transform (Scoping)', function () {
    describe('scoped elements', function () {
        // tslint:disable-next-line:max-line-length
        it('component/tag selector with first Capital letter automatically extends reference with identical name', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/style.st.css",
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: "\n                            :import {\n                                -st-from: \"./imported.st.css\";\n                                -st-default: Element;\n                            }\n                            Element {}\n                            .root Element {}\n                        "
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: ""
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.ns--root .ns1--root');
            chai_1.expect(result.nodes[1].selector).to.equal('.ns--root .ns1--root');
        });
        // tslint:disable-next-line:max-line-length
        it('component/tag selector with first Capital letter automatically extend reference with identical name (inner parts)', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Element;\n                            }\n                            Element::part {}\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: "\n                            .part {}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.entry--root .inner--root .inner--part');
        });
    });
    describe('scoped pseudo-elements', function () {
        it('component/tag selector that extends root with inner class targeting', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/style.st.css",
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Container;\n                            }\n                            Container::inner {}\n                            Container::inner::deep {}\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: "\n                            :import {\n                                -st-from: \"./deep.st.css\";\n                                -st-default: Deep;\n                            }\n                            .inner {\n                                -st-extends: Deep;\n                            }\n                        "
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: "\n                            .deep {}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.ns--root .ns1--root .ns1--inner');
            chai_1.expect(result.nodes[1].selector).to.equal('.ns--root .ns1--root .ns1--inner .ns2--deep');
        });
        it('component/tag selector with custom states', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/style.st.css",
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Container;\n                            }\n                            Container:state {}\n\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: "\n                            .root {\n                                -st-states: state;\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.ns--root .ns1--root[data-ns1-state]');
        });
        it('component/tag selector with -st-global', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/style.st.css",
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Container;\n                            }\n                            Container {}\n\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: "\n                            .root {\n                                -st-global: \".x\";\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.ns--root .x');
        });
        it('class selector that extends root with inner class targeting (deep)', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/style.st.css",
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Container;\n                            }\n                            .app {\n                                -st-extends: Container;\n                            }\n                            .app::inner {}\n                            .app::inner::deep {}\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: "\n                            :import {\n                                -st-from: \"./deep.st.css\";\n                                -st-default: Deep;\n                            }\n                            .inner {\n                                -st-extends: Deep;\n                            }\n                        "
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: "\n                            .deep {}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector).to.equal('.ns--root .ns--app.ns1--root .ns1--inner');
            chai_1.expect(result.nodes[2].selector)
                .to.equal('.ns--root .ns--app.ns1--root .ns1--inner .ns2--deep');
        });
        it('resolve and transform pseudo-element from deeply extended type', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'ns',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Inner;\n                            }\n                            .app {\n                                -st-extends: Inner;\n                            }\n                            .app::deep {}\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: "\n                            :import {\n                                -st-from: \"./deep.st.css\";\n                                -st-default: Deep;\n                            }\n                            .root {\n                                -st-extends: Deep;\n                            }\n                        "
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: "\n                            .deep {}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector).to.equal('.ns--root .ns--app.ns1--root .ns2--deep');
        });
        it('resolve and transform pseudo-element from deeply override rather then extended type', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'ns',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Container;\n                            }\n                            .app {\n                                -st-extends: Container;\n                            }\n                            .app::deep {}\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: "\n                            :import {\n                                -st-from: \"./deep.st.css\";\n                                -st-default: Deep;\n                            }\n                            .root {\n                                -st-extends: Deep;\n                            }\n                            .deep {}\n                        "
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: "\n                            .deep {}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector).to.equal('.ns--root .ns--app.ns1--root .ns1--deep');
        });
        it('resolve and transform pseudo-element on root - prefer inherited element to override', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Inner;\n                            }\n                            .root {\n                                -st-extends: Inner;\n                            }\n                            .root::inner, .inner { }\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: "\n                            .inner {}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector)
                .to.equal('.entry--root.inner--root .inner--inner, .entry--root .entry--inner');
        });
        it('resolve and transform pseudo-element with -st-global output', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Inner;\n                            }\n                            Inner {}\n                            Inner::a {}\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: "\n                            .root { -st-global: \".x\";}\n                            .a { -st-global: \".y\";}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.entry--root .x');
            chai_1.expect(result.nodes[1].selector).to.equal('.entry--root .x .y');
        });
        it('should work with nested pseudo selectors', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: '/entry.st.css',
                usedFiles: [
                    '/entry.st.css'
                ],
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            .container {\n                                 -st-states: state;\n                            }\n                            .container:state {\n                                background: green;\n                            }\n                            .container:not(:state) {\n                                background: red;\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[2].selector)
                .to.equal('.entry--root .entry--container:not([data-entry-state])');
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
        it('using nested pseudo selectors for pseudo elements', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/style.st.css",
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Container;\n                            }\n                            Container::item:not(:selected) {\n                                background: yellow;\n                            }\n                            Container::item:selected {\n                                background: purple;\n                            }\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: "\n                            .item {\n                                -st-states: selected;\n                                background: red;\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector)
                .to.equal('.ns--root .ns1--root .ns1--item:not([data-ns1-selected])');
            chai_1.expect(result.nodes[1].selector)
                .to.equal('.ns--root .ns1--root .ns1--item[data-ns1-selected]');
        });
        it('resolve extend on extended alias', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Inner;\n                            }\n                            Inner::deep::up { }\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'Inner',
                        content: "\n                            :import {\n                                -st-from: \"./deep.st.css\";\n                                -st-default: deep;\n                            }\n                            .deep {\n                                -st-extends: deep;\n                            }\n                        "
                    },
                    '/deep.st.css': {
                        namespace: 'Deep',
                        content: "\n                            .root {}\n                            .up{}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector)
                .to.equal('.entry--root .Inner--root .Inner--deep .Deep--up');
        });
    });
    describe('scoped classes', function () {
        it('scope local classes', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            .a {}\n                            .b, .c {}\n                            .d .e {}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.entry--root .entry--a');
            chai_1.expect(result.nodes[1].selector)
                .to.equal('.entry--root .entry--b, .entry--root .entry--c');
            chai_1.expect(result.nodes[2].selector).to.equal('.entry--root .entry--d .entry--e');
        });
        it('scope local root class', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            .root {}\n                            .root .a {}\n                            .root .b, .c{}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.entry--root');
            chai_1.expect(result.nodes[1].selector).to.equal('.entry--root .entry--a');
            chai_1.expect(result.nodes[2].selector)
                .to.equal('.entry--root .entry--b, .entry--root .entry--c');
        });
        it('scope according to -st-global', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            .root {\n                                -st-global: \".x\";\n                            }\n                            .a {\n                                -st-global: \".y\";\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.x');
            chai_1.expect(result.nodes[1].selector).to.equal('.x .y');
        });
        it('scope according to -st-global complex chunk', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            .root {\n                                -st-global: \".x.y\";\n                            }\n                            .a {\n                                -st-global: \".z\";\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.x.y');
            chai_1.expect(result.nodes[1].selector).to.equal('.x.y .z');
        });
        it('scope selector that extends local root', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            .a {\n                                -st-extends: root;\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.entry--a.entry--root');
        });
        it.skip('TODO: fix it. scope selector that extends local root', function () {
            generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            .a, .b {\n                                -st-extends: root;\n                            }\n                        "
                    }
                }
            });
        });
        it('scope selector that extends anther style', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import{\n                                -st-from: \"./imported.st.css\";\n                                -st-default: Imported;\n                            }\n                            .a {\n                                -st-extends: Imported;\n                            }\n                        "
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: ''
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.entry--root .entry--a.imported--root');
        });
        it('scope selector that extends a style with -st-global root', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import{\n                                -st-from: \"./imported.st.css\";\n                                -st-default: Imported;\n                            }\n                            .a {\n                                -st-extends: Imported;\n                            }\n                        "
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: "\n                            .root {\n                                -st-global: \".x\";\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.entry--root .entry--a.x');
        });
        it('scope class alias', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import{\n                                -st-from: \"./imported.st.css\";\n                                -st-default: Imported;\n                                -st-named: inner-class;\n                            }\n\n                            .Imported{}\n                            .inner-class{}\n                        "
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: "\n                            .inner-class {\n\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector, 'root alias').to.equal('.entry--root .imported--root');
            chai_1.expect(result.nodes[1].selector, 'class alias')
                .to.equal('.entry--root .imported--inner-class');
        });
        it('scope class alias that also extends', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import{\n                                -st-from: \"./imported.st.css\";\n                                -st-default: Imported;\n                                -st-named: inner-class;\n                            }\n                            .inner-class{\n                                -st-extends: inner-class\n                            }\n                        "
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: "\n                            .inner-class {\n\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector, 'class alias')
                .to.equal('.entry--root .entry--inner-class.imported--inner-class');
        });
        it('scope class alias that extends and have pseudo elements ', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import{\n                                -st-from: \"./imported.st.css\";\n                                -st-named: inner-class;\n                            }\n\n                            .inner-class::base {\n\n                            }\n                        "
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: "\n                            :import{\n                                -st-from: \"./base.st.css\";\n                                -st-default: Base;\n                            }\n                            .inner-class {\n                                -st-extends: Base;\n                            }\n                        "
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: "\n                            .base {\n\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector, 'class alias')
                .to.equal('.entry--root .imported--inner-class .base--base');
        });
        it('scope selector that extends local class', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/style.st.css",
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: "\n                            .a {\n\n                            }\n                            .b {\n                                -st-extends: a;\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector).to.equal('.ns--root .ns--b.ns--a');
        });
        it('extends class form imported sheet', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/style.st.css",
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: "\n                            :import{\n                                -st-from: \"./imported.st.css\";\n                                -st-named: b;\n                            }\n                            .a {\n                                -st-extends: b;\n                            }\n                        "
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: "\n                        .b {\n\n                        }\n                    "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.ns--root .ns--a.ns1--b');
        });
        it('handle not existing imported class', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/style.st.css",
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: "\n                            :import{\n                                -st-from: \"./imported.st.css\";\n                                -st-named: b;\n                            }\n                            .b {}\n                        "
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: "\n\n                    "
                    }
                }
            });
            chai_1.expect(result.nodes[0].selector).to.equal('.ns--root .ns--b');
        });
    });
    describe('scoped states', function () {
        it('custom states inline', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            .my-class {\n                                -st-states: my-state;\n                            }\n                            .my-class:my-state {}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector)
                .to.equal('.entry--root .entry--my-class[data-entry-my-state]');
        });
        it('custom states with mapping', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            .my-class {\n                                -st-states: my-state('.x'), my-other-state(\"  .y[data-z=\\\"value\\\"]  \");\n                            }\n                            .my-class:my-state {}\n                            .my-class:my-other-state {}\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector).to.equal('.entry--root .entry--my-class.x');
            chai_1.expect(result.nodes[2].selector)
                .to.equal('.entry--root .entry--my-class.y[data-z="value"]');
        });
        it('custom states with focus-within', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            .root {\n                                -st-states: open(\":not(:focus-within):not(:hover)\");\n                            }\n                            .root:open {\n\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector).to.equal('.entry--root:not(:focus-within):not(:hover)');
        });
        it('custom states lookup order', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Inner;\n                            }\n                            .my-class {\n                                -st-states: my-state;\n                                -st-extends: Inner;\n                            }\n                            .my-class:my-state {}\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: "\n                            .root {\n                                -st-states: my-state;\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector)
                .to.equal('.entry--root .entry--my-class.inner--root[data-entry-my-state]');
        });
        it('custom states from imported type', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Inner;\n                            }\n                            .my-class {\n                                -st-extends: Inner;\n                            }\n                            .my-class:my-state {}\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: "\n                            .root {\n                                -st-states: my-state;\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector)
                .to.equal('.entry--root .entry--my-class.inner--root[data-inner-my-state]');
        });
        it('custom states from deep imported type', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Inner;\n                            }\n                            .my-class {\n                                -st-extends: Inner;\n                            }\n                            .my-class:my-state {}\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: "\n                            :import {\n                                -st-from: \"./deep.st.css\";\n                                -st-default: Deep;\n                            }\n                            .root {\n                                -st-extends: Deep;\n                            }\n                        "
                    },
                    '/deep.st.css': {
                        namespace: 'deep',
                        content: "\n                            .root {\n                                -st-states: my-state;\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector)
                .to.equal('.entry--root .entry--my-class.inner--root[data-deep-my-state]');
        });
        it('custom states form imported type on inner pseudo-class', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import {\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Inner;\n                            }\n                            .my-class {\n                                -st-extends: Inner;\n                            }\n                            .my-class::container:my-state {}\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: "\n                            .container {\n                                -st-states: my-state;\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector)
                .to.equal('.entry--root .entry--my-class.inner--root .inner--container[data-inner-my-state]');
        });
        it('custom states form imported type on inner pseudo-class deep', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            :import{\n                                -st-from: \"./inner.st.css\";\n                                -st-default: Inner;\n                            }\n                            .my-class {\n                                -st-extends: Inner;\n                            }\n                            .my-class::container:my-state {}\n                        "
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: "\n                            :import {\n                                -st-from: \"./deep.st.css\";\n                                -st-default: Deep;\n                            }\n                            .root {\n\n                            }\n                            .container {\n                                -st-extends: Deep;\n                            }\n                        "
                    },
                    '/deep.st.css': {
                        namespace: 'deep',
                        content: "\n                            .root {\n                                -st-states: my-state;\n                            }\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[1].selector)
                .to.equal('.entry--root .entry--my-class.inner--root .inner--container[data-deep-my-state]');
        });
    });
    describe('@media scoping', function () {
        it('handle scoping inside media queries', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            @media (max-width: 300px) {\n                                .my-class {\n                                    -st-states: my-state;\n                                }\n                                .my-class:my-state {}\n                            }\n                        "
                    }
                }
            });
            var mediaNode = result.nodes[0];
            chai_1.expect(mediaNode.nodes[0].selector)
                .to.equal('.entry--root .entry--my-class');
            chai_1.expect(mediaNode.nodes[1].selector)
                .to.equal('.entry--root .entry--my-class[data-entry-my-state]');
        });
    });
    describe('@keyframes scoping', function () {
        it('scope animation and animation name', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            @keyframes name {\n                                from {}\n                                to {}\n                            }\n\n                            @keyframes name2 {\n                                from {}\n                                to {}\n                            }\n\n                            .selector {\n                                animation: 2s name infinite, 1s name2 infinite;\n                                animation-name: name;\n                            }\n\n                        "
                    }
                }
            });
            chai_1.expect(result.nodes[0].params).to.equal('entry--name');
            chai_1.expect(result.nodes[1].params).to.equal('entry--name2');
            chai_1.expect(result.nodes[2].nodes[0].toString())
                .to.equal('animation: 2s entry--name infinite, 1s entry--name2 infinite');
            chai_1.expect(result.nodes[2].nodes[1].toString())
                .to.equal('animation-name: entry--name');
        });
        it('not scope rules that are child of keyframe atRule', function () {
            var result = generate_test_util_1.generateStylableRoot({
                entry: "/entry.st.css",
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: "\n                            @keyframes name {\n                                from {}\n                                to {}\n                            }\n                            @keyframes name2 {\n                                0% {}\n                                100% {}\n                            }\n                        "
                    }
                }
            });
            var at = result.nodes[0];
            chai_1.expect(at.nodes[0].selector).to.equal('from');
            chai_1.expect(at.nodes[1].selector).to.equal('to');
            var at1 = result.nodes[1];
            chai_1.expect(at1.nodes[0].selector).to.equal('0%');
            chai_1.expect(at1.nodes[1].selector).to.equal('100%');
        });
    });
});
//# sourceMappingURL=scoping.spec.js.map