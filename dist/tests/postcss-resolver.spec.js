"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var path_1 = require("path");
var src_1 = require("../src");
var cached_process_file_1 = require("../src/cached-process-file");
function createResolveExtendsResults(fs, fileToProcess, classNameToLookup, isElement) {
    if (isElement === void 0) { isElement = false; }
    var processFile = cached_process_file_1.cachedProcessFile(function (fullpath, content) {
        return src_1.process(src_1.safeParse(content, { from: fullpath }));
    }, fs);
    var resolver = new src_1.StylableResolver(processFile, function (module) { return (module && ''); });
    return resolver.resolveExtends(processFile.process(fileToProcess), classNameToLookup, isElement);
}
describe('postcss-resolver', function () {
    it('should resolve extend classes', function () {
        var fs = src_1.createMinimalFS({
            files: {
                '/button.st.css': {
                    content: "\n                        @namespace:'Button';\n                        .root {\n                            color:red;\n                        }\n                    "
                },
                '/extended-button.st.css': {
                    content: "\n                        :import {\n                            -st-from: './button.st.css';\n                            -st-default: Button;\n                        }\n                        .myClass {\n                            -st-extends:Button;\n                            width: 100px;\n                        }\n                    "
                }
            }
        }).fs;
        var results = createResolveExtendsResults(fs, '/extended-button.st.css', 'myClass');
        chai_1.expect(results[0].symbol.name).to.equal('myClass');
        chai_1.expect(results[1].symbol.name).to.equal('root');
        chai_1.expect(results[1].meta.source).to.equal(path_1.resolve('/button.st.css'));
    });
    it('should resolve extend elements', function () {
        var fs = src_1.createMinimalFS({
            files: {
                '/button.st.css': {
                    content: "\n                        @namespace:'Button';\n                        .root {\n                            color:red;\n                        }\n                    "
                },
                '/extended-button.st.css': {
                    content: "\n                        :import {\n                            -st-from: './button.st.css';\n                            -st-default: Button;\n                        }\n                        Button {\n                            width: 100px;\n                        }\n                    "
                }
            }
        }).fs;
        var results = createResolveExtendsResults(fs, '/extended-button.st.css', 'Button', true);
        chai_1.expect(results[0].symbol.name).to.equal('Button');
        chai_1.expect(results[1].symbol.name).to.equal('root');
        chai_1.expect(results[1].meta.source).to.equal(path_1.resolve('/button.st.css'));
    });
    it('should resolve extend classes on broken css', function () {
        var fs = src_1.createMinimalFS({
            files: {
                '/button.st.css': {
                    content: "\n                        .gaga\n                    "
                }
            }
        }).fs;
        var results = createResolveExtendsResults(fs, path_1.resolve('/button.st.css'), 'gaga');
        chai_1.expect(results).to.eql([]);
    });
});
//# sourceMappingURL=postcss-resolver.spec.js.map