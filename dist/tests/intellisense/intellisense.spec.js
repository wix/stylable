"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var generate_test_util_1 = require("../utils/generate-test-util");
describe('Stylable intellisense selector meta data', function () {
    it('resolve single class element', function () {
        var t = generate_test_util_1.createTransformer({
            files: {
                '/entry.st.css': {
                    content: "\n                        .a {\n\n                        }\n                    "
                }
            }
        });
        var meta = t.fileProcessor.process('/entry.st.css');
        var elements = t.resolveSelectorElements(meta, '.a');
        chai_1.expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'a',
                resolved: [
                    {
                        meta: meta,
                        symbol: meta.classes.a,
                        _kind: 'css'
                    }
                ]
            }
        ]);
    });
    it('resolve pseudo-element', function () {
        var t = generate_test_util_1.createTransformer({
            files: {
                '/entry.st.css': {
                    content: "\n                        :import {\n                            -st-from: \"./other.st.css\";\n                            -st-default: Other;\n                        }\n                        .a {\n                            -st-extends: Other;\n                            -st-states: b;\n                        }\n                    "
                },
                '/other.st.css': {
                    content: "\n                        .c {\n                        }\n                    "
                }
            }
        });
        var meta = t.fileProcessor.process('/entry.st.css');
        var otherMeta = t.fileProcessor.process('/other.st.css');
        var elements = t.resolveSelectorElements(meta, '.a:b::c');
        chai_1.expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'a',
                resolved: [
                    {
                        meta: meta,
                        symbol: meta.classes.a,
                        _kind: 'css'
                    },
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.root,
                        _kind: 'css'
                    }
                ]
            },
            {
                type: 'pseudo-element',
                name: 'c',
                resolved: [
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.c,
                        _kind: 'css'
                    }
                ]
            }
        ]);
    });
    it('resolve extedns of named class', function () {
        var t = generate_test_util_1.createTransformer({
            files: {
                '/entry.st.css': {
                    content: "\n                        :import {\n                            -st-from: \"./other.st.css\";\n                            -st-named: c;\n                        }\n                        .a {\n                            -st-extends: c;\n                        }\n                    "
                },
                '/other.st.css': {
                    content: "\n                        .c {\n                            -st-states: b;\n                        }\n                    "
                }
            }
        });
        var meta = t.fileProcessor.process('/entry.st.css');
        var otherMeta = t.fileProcessor.process('/other.st.css');
        var elements = t.resolveSelectorElements(meta, '.a:b::c');
        chai_1.expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'a',
                resolved: [
                    {
                        meta: meta,
                        symbol: meta.classes.a,
                        _kind: 'css'
                    },
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.c,
                        _kind: 'css'
                    }
                ]
            },
            {
                type: 'pseudo-element',
                name: 'c',
                resolved: [
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.c,
                        _kind: 'css'
                    }
                ]
            }
        ]);
    });
    it('resolve complex selector with multiple inheritance of roots', function () {
        var t = generate_test_util_1.createTransformer({
            files: {
                '/entry.st.css': {
                    content: "\n                    :import {\n                        -st-from: \"./recursive-import-2.st.css\";\n                        -st-default: Comp;\n                    }\n\n                    .gaga {\n                        -st-extends: Comp;\n                        -st-states: lala;\n                    }\n                "
                },
                '/recursive-import-2.st.css': {
                    content: "\n                    :import {\n                        -st-from: \"./recursive-import-1.st.css\";\n                        -st-default: Comp;\n                    }\n\n                    .bobo {\n                        -st-extends: Comp;\n                    }\n                    "
                },
                '/recursive-import-1.st.css': {
                    content: "\n                    :import {\n                        -st-from: \"./recursive-import-0.st.css\";\n                        -st-default: Compi;\n                    }\n\n                    .shlomo {\n                        color: black;\n                    }\n\n                    .momo{\n                        -st-extends: Compi;\n                        -st-states: anotherState;\n                    }\n\n                    .root {\n                        -st-states : state,otherState;\n                    }\n                    "
                },
                '/recursive-import-0.st.css': {
                    content: "\n                    :import {\n                        -st-from: \"./recursive-import.st.css\";\n                        -st-default: Last;\n                    }\n\n                    .root {\n                        -st-extends: Last;\n                        -st-states : loompa;\n                    }\n                    "
                },
                '/recursive-import.st.css': {
                    content: "\n                    .root {}\n                    "
                }
            }
        });
        var meta = t.fileProcessor.process('/entry.st.css');
        var recursive2 = t.fileProcessor.process('/recursive-import-2.st.css');
        var recursive1 = t.fileProcessor.process('/recursive-import-1.st.css');
        var recursive0 = t.fileProcessor.process('/recursive-import-0.st.css');
        var last = t.fileProcessor.process('/recursive-import.st.css');
        var elements = t.resolveSelectorElements(meta, '.gaga:lala::bobo:otherState:state::momo:anotherState');
        chai_1.expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'gaga',
                resolved: [
                    {
                        meta: meta,
                        symbol: meta.classes.gaga,
                        _kind: 'css'
                    },
                    {
                        meta: recursive2,
                        symbol: recursive2.classes.root,
                        _kind: 'css'
                    }
                ]
            },
            {
                type: 'pseudo-element',
                name: 'bobo',
                resolved: [
                    {
                        meta: recursive2,
                        symbol: recursive2.classes.bobo,
                        _kind: 'css'
                    },
                    {
                        meta: recursive1,
                        symbol: recursive1.classes.root,
                        _kind: 'css'
                    }
                ]
            },
            {
                type: 'pseudo-element',
                name: 'momo',
                resolved: [
                    {
                        meta: recursive1,
                        symbol: recursive1.classes.momo,
                        _kind: 'css'
                    },
                    {
                        meta: recursive0,
                        symbol: recursive0.classes.root,
                        _kind: 'css'
                    },
                    {
                        meta: last,
                        symbol: last.classes.root,
                        _kind: 'css'
                    }
                ]
            }
        ]);
    });
});
//# sourceMappingURL=intellisense.spec.js.map