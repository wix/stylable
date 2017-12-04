"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cached_process_file_1 = require("./cached-process-file");
var diagnostics_1 = require("./diagnostics");
var parser_1 = require("./parser");
var runtime_1 = require("./runtime");
var stylable_processor_1 = require("./stylable-processor");
var stylable_transformer_1 = require("./stylable-transformer");
function createGenerator(fs, requireModule, delimiter) {
    if (fs === void 0) { fs = {
        readFileSync: function (_path) {
            return '';
        },
        statSync: function (_path) {
            return { mtime: new Date(0) };
        }
    }; }
    if (requireModule === void 0) { requireModule = function (_path) { return ({}); }; }
    if (delimiter === void 0) { delimiter = '--'; }
    var fileProcessor = cached_process_file_1.cachedProcessFile(function (from, content) {
        return stylable_processor_1.process(parser_1.safeParse(content, { from: from }));
    }, fs);
    function output(meta) {
        var diagnostics = new diagnostics_1.Diagnostics();
        var transformer = new stylable_transformer_1.StylableTransformer({
            fileProcessor: fileProcessor,
            requireModule: requireModule,
            diagnostics: diagnostics,
            delimiter: delimiter
        });
        var exports = transformer.transform(meta).exports;
        return {
            meta: meta,
            transformer: transformer,
            diagnostics: diagnostics,
            runtime: runtime_1.create(meta.root, meta.namespace, exports, '', meta.source)
        };
    }
    return {
        fileProcessor: fileProcessor,
        delimiter: delimiter,
        scope: stylable_transformer_1.StylableTransformer.prototype.scope,
        fromCSS: function (source, path) {
            if (path === void 0) { path = '/unknown.st.css'; }
            var root = parser_1.safeParse(source, { from: path });
            var meta = stylable_processor_1.process(root);
            fileProcessor.add(meta.source, meta);
            return output(meta);
        },
        fromFile: function (path) {
            var meta = fileProcessor.process(path);
            return output(meta);
        }
    };
}
exports.createGenerator = createGenerator;
//# sourceMappingURL=generator.js.map