"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var postcss = require("postcss");
var cached_process_file_1 = require("../src/cached-process-file");
var stylable_processor_1 = require("../src/stylable-processor");
var chai = require("chai");
var path_1 = require("path");
var falt_match_1 = require("./matchers/falt-match");
var expect = chai.expect;
chai.use(falt_match_1.flatMatch);
exports.loadFile = cached_process_file_1.cachedProcessFile(function (path, content) {
    return processSource(content, { from: path });
}, {
    readFileSync: function () {
        return '';
    },
    statSync: function () {
        return { mtime: new Date() };
    }
});
function processSource(source, options) {
    if (options === void 0) { options = {}; }
    return stylable_processor_1.process(postcss.parse(source, options));
}
describe('Stylable postcss process', function () {
    it('report if missing filename', function () {
        var _a = processSource(""), diagnostics = _a.diagnostics, namespace = _a.namespace;
        expect(namespace).to.equal('s0');
        expect(diagnostics.reports[0]).to.include({
            type: 'error',
            message: 'missing source filename'
        });
    });
    it('report on invalid namespace', function () {
        var diagnostics = processSource("@namespace App;", { from: '/path/to/source' }).diagnostics;
        expect(diagnostics.reports[0]).to.include({
            type: 'error',
            message: 'invalid namespace'
        });
    });
    it('collect namespace', function () {
        var from = path_1.resolve('/path/to/style.css');
        var result = processSource("\n            @namespace \"name\";\n            @namespace 'anther-name';\n        ", { from: from });
        expect(result.namespace).to.equal(stylable_processor_1.processNamespace('anther-name', from));
    });
    it('use filename as default namespace prefix', function () {
        var from = path_1.resolve('/path/to/style.css');
        var result = processSource("\n\n        ", { from: from });
        expect(result.namespace).to.eql(stylable_processor_1.processNamespace('style', from));
    });
    it('collect :import', function () {
        var result = processSource("\n            :import {\n                -st-from: \"./some/path\";\n            }\n            :import {\n                -st-from: \"./some/other/path\";\n                -st-named: a,b as c;\n            }\n            :import {\n                -st-from: \"../some/global/path\";\n                -st-default: name;\n            }\n        ", { from: 'path/to/style.css' });
        expect(result.imports.length).to.eql(3);
        expect(result.mappedSymbols.a).to.include({
            _kind: 'import',
            type: 'named'
        });
        expect(result.mappedSymbols.c).to.include({
            _kind: 'import',
            type: 'named'
        });
        expect(result.mappedSymbols.name).to.include({
            _kind: 'import',
            type: 'default'
        });
        expect(result.mappedSymbols.a.import).to.deep.include({
            // from: '/path/to/some/other/path',
            fromRelative: './some/other/path',
            defaultExport: '',
            named: { a: 'a', c: 'b' }
        });
        expect(result.mappedSymbols.c.import).to.deep.include({
            // from: '/path/to/some/other/path',
            fromRelative: './some/other/path',
            defaultExport: '',
            named: { a: 'a', c: 'b' }
        });
        expect(result.mappedSymbols.name.import).to.deep.include({
            // from: '/path/some/global/path',
            fromRelative: '../some/global/path',
            defaultExport: 'name',
            named: {}
        });
    });
    xit('collect :import warnings', function () {
        var result = processSource("\n            :import {}\n            :import {\n                color: red;\n            }\n        ", { from: 'path/to/style.css' });
        expect(result.diagnostics.reports[0].message).to.eql('"-st-from" is missing in :import block');
        expect(result.diagnostics.reports[1].message)
            .to.eql('"color" css attribute cannot be used inside :import block');
    });
    it('collect :import overrides', function () {
        var result = processSource("\n            :import {\n                color: red;\n                color2: blue;\n            }\n        ", { from: 'path/to/style.css' });
        expect(result.imports[0].overrides[0].toString()).to.equal('color: red');
        expect(result.imports[0].overrides[1].toString()).to.equal('color2: blue');
    });
    it('collect :vars', function () {
        var result = processSource("\n            :vars {\n                name: value;\n            }\n            :vars {\n                name: value;\n                name1: value1;\n            }\n        ", { from: 'path/to/style.css' });
        expect(result.vars.length).to.eql(3);
    });
    it('resolve local :vars (by order of definition)', function () {
        var result = processSource("\n            :vars {\n                name: value;\n                myname: value(name);\n            }\n        ", { from: 'path/to/style.css' });
        // should be refactored out of here.
        for (var name_1 in result.mappedSymbols) {
            delete result.mappedSymbols[name_1].node;
        }
        expect(result.mappedSymbols).to.deep.include({
            name: {
                _kind: 'var',
                name: 'name',
                value: 'value',
                text: 'value',
                import: null
            },
            myname: {
                _kind: 'var',
                name: 'myname',
                value: 'value',
                text: 'value(name)',
                import: null
            }
        });
    });
    it('resolve local :vars (dont warn if name is imported)', function () {
        var result = processSource("\n            :import {\n                -st-from: \"./file.css\";\n                -st-named: name;\n            }\n            :vars {\n                myname: value(name);\n            }\n        ", { from: 'path/to/style.css' });
        expect(result.diagnostics.reports.length, 'no reports').to.eql(0);
    });
    it('collect typed classes extends', function () {
        var result = processSource("\n            :import {\n                -st-from: './file.css';\n                -st-default: Style;\n            }\n            .myclass {\n                -st-extends: Style;\n            }\n        ", { from: 'path/to/style.css' });
        expect(result.diagnostics.reports.length, 'no reports').to.eql(0);
        expect(result.classes).to.flatMatch({
            myclass: {
                '-st-extends': {
                    _kind: 'import',
                    type: 'default',
                    import: {
                        // from: '/path/to/file.css',
                        fromRelative: './file.css',
                        defaultExport: 'Style'
                    }
                }
            }
        });
    });
    it('collect typed classes compose', function () {
        var result = processSource("\n            :import {\n                -st-from: './file.css';\n                -st-default: Style;\n            }\n            .class {}\n            .my-class {\n                -st-compose: Style, class;\n            }\n        ", { from: 'path/to/style.css' });
        expect(result.diagnostics.reports.length, 'no reports').to.eql(0);
        expect(result.classes).to.flatMatch({
            'my-class': {
                '-st-compose': [
                    {
                        _kind: 'import',
                        type: 'default',
                        import: {
                            // from: '/path/to/file.css',
                            fromRelative: './file.css',
                            defaultExport: 'Style'
                        }
                    },
                    {
                        _kind: 'class',
                        name: 'class'
                    }
                ]
            }
        });
    });
    it('collect typed classes with auto states', function () {
        var result = processSource("\n            .root {\n                -st-states: state1, state2;\n            }\n        ", { from: 'path/to/style.css' });
        expect(result.diagnostics.reports.length, 'no reports').to.eql(0);
        expect(result.classes).to.flatMatch({
            root: {
                '-st-states': {
                    state1: null,
                    state2: null
                }
            }
        });
    });
    it('collect typed classes with mapping states', function () {
        var result = processSource("\n            .root {\n                -st-states: state1, state2(\"[data-mapped]\");\n            }\n        ", { from: 'path/to/style.css' });
        expect(result.diagnostics.reports.length, 'no reports').to.eql(0);
        expect(result.classes).to.flatMatch({
            root: {
                '-st-states': {
                    state1: null,
                    state2: '[data-mapped]'
                }
            }
        });
    });
    it('collect typed elements', function () {
        var result = processSource("\n            Element {\n\n            }\n            div {\n\n            }\n        ", { from: 'path/to/style.css' });
        expect(Object.keys(result.elements).length).to.eql(1);
    });
    it('always contain root class', function () {
        var result = processSource("\n\n        ", { from: 'path/to/style.css' });
        expect(result.classes).to.eql({
            root: {
                '_kind': 'class',
                'name': 'root',
                '-st-root': true
            }
        });
    });
    it('collect classes', function () {
        var result = processSource("\n            .root{}\n            .classA{}\n            .classB, .classC, .classA{}\n            :not(.classD){}\n            .classE:hover{}\n        ", { from: 'path/to/style.css' });
        expect(Object.keys(result.classes).length).to.eql(6);
    });
    it('collect classes in @media', function () {
        var result = processSource("\n            @media (max-width: 300px) {\n                .root{}\n                .classA{}\n                .classB, .classC{}\n                :not(.classD){}\n                .classE:hover{}\n            }\n        ", { from: 'path/to/style.css' });
        expect(Object.keys(result.classes).length).to.eql(6);
    });
    it('collect @keyframes', function () {
        var result = processSource("\n            @keyframes name {\n                from{}\n                to{}\n            }\n            @keyframes anther-name {\n                from{}\n                to{}\n            }\n        ", { from: 'path/to/style.css' });
        expect(result.keyframes.length).to.eql(2);
    });
    it('should annotate import with -st-theme', function () {
        var result = processSource("\n            :import {\n                -st-theme: true;\n                -st-from: \"./theme.st.css\";\n            }\n        ");
        var importSymbol = result.imports[0];
        expect(importSymbol.theme).to.eql(true);
    });
});
//# sourceMappingURL=postcss-process.spec.js.map