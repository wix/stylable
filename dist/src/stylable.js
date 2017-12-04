"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bundle_1 = require("./bundle");
var create_infra_structure_1 = require("./create-infra-structure");
var diagnostics_1 = require("./diagnostics");
var parser_1 = require("./parser");
var postcss_resolver_1 = require("./postcss-resolver");
var stylable_processor_1 = require("./stylable-processor");
var stylable_transformer_1 = require("./stylable-transformer");
var Stylable = /** @class */ (function () {
    function Stylable(projectRoot, fileSystem, requireModule, delimiter, onProcess, diagnostics) {
        if (delimiter === void 0) { delimiter = '--'; }
        if (diagnostics === void 0) { diagnostics = new diagnostics_1.Diagnostics(); }
        this.projectRoot = projectRoot;
        this.fileSystem = fileSystem;
        this.requireModule = requireModule;
        this.delimiter = delimiter;
        this.onProcess = onProcess;
        this.diagnostics = diagnostics;
        var _a = create_infra_structure_1.createInfrastructure(projectRoot, fileSystem, onProcess), fileProcessor = _a.fileProcessor, resolvePath = _a.resolvePath;
        this.resolvePath = resolvePath;
        this.fileProcessor = fileProcessor;
        this.resolver = new postcss_resolver_1.StylableResolver(this.fileProcessor, this.requireModule);
    }
    Stylable.prototype.createBundler = function () {
        return new bundle_1.Bundler(this);
    };
    Stylable.prototype.transform = function (meta, resourcePath) {
        if (typeof meta === 'string') {
            var root = parser_1.safeParse(meta, { from: resourcePath });
            meta = stylable_processor_1.process(root, new diagnostics_1.Diagnostics());
        }
        var transformer = new stylable_transformer_1.StylableTransformer({
            delimiter: this.delimiter,
            diagnostics: new diagnostics_1.Diagnostics(),
            fileProcessor: this.fileProcessor,
            requireModule: this.requireModule
        });
        this.fileProcessor.add(meta.source, meta);
        return transformer.transform(meta);
    };
    Stylable.prototype.process = function (fullpath) {
        return this.fileProcessor.process(fullpath);
    };
    return Stylable;
}());
exports.Stylable = Stylable;
//# sourceMappingURL=stylable.js.map