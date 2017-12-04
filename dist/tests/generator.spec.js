"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var generator_1 = require("../src/generator");
var memory_minimal_fs_1 = require("../src/memory-minimal-fs");
describe('generator fromCSS', function () {
    it('should contain locals mapping', function () {
        var gen = generator_1.createGenerator();
        var _a = gen.fromCSS("\n            .root {\n                color: red;\n            }\n        "), runtime = _a.runtime, meta = _a.meta;
        chai_1.expect(runtime.root).to.equal(gen.scope('root', meta.namespace));
    });
    it('should contain $stylesheet', function () {
        var gen = generator_1.createGenerator();
        var runtime = gen.fromCSS("\n            .root {\n                color: red;\n            }\n        ").runtime;
        chai_1.expect(runtime.$stylesheet.root).to.equal('root');
    });
});
describe('generator fromFile', function () {
    it('should contain locals mapping', function () {
        var _a = memory_minimal_fs_1.createMinimalFS({
            files: {
                '/style.st.css': {
                    content: ''
                }
            }
        }), fs = _a.fs, requireModule = _a.requireModule;
        var gen = generator_1.createGenerator(fs, requireModule);
        var _b = gen.fromFile('/style.st.css'), runtime = _b.runtime, meta = _b.meta;
        chai_1.expect(runtime.root).to.equal(gen.scope('root', meta.namespace));
    });
    it('should contain $stylesheet', function () {
        var _a = memory_minimal_fs_1.createMinimalFS({
            files: {
                '/style.st.css': {
                    content: ''
                }
            }
        }), fs = _a.fs, requireModule = _a.requireModule;
        var gen = generator_1.createGenerator(fs, requireModule);
        var runtime = gen.fromFile('/style.st.css').runtime;
        chai_1.expect(runtime.$stylesheet.root).to.equal('root');
    });
});
//# sourceMappingURL=generator.spec.js.map