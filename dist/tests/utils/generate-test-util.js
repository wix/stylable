"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var postcss = require("postcss");
var bundle_1 = require("../../src/bundle");
var cached_process_file_1 = require("../../src/cached-process-file");
var diagnostics_1 = require("../../src/diagnostics");
var memory_minimal_fs_1 = require("../../src/memory-minimal-fs");
var postcss_resolver_1 = require("../../src/postcss-resolver");
var stylable_1 = require("../../src/stylable");
var stylable_processor_1 = require("../../src/stylable-processor");
var stylable_transformer_1 = require("../../src/stylable-transformer");
function generateInfra(config, diagnostics) {
    var _a = memory_minimal_fs_1.createMinimalFS(config), fs = _a.fs, requireModule = _a.requireModule;
    var fileProcessor = cached_process_file_1.cachedProcessFile(function (from, content) {
        var meta = stylable_processor_1.process(postcss.parse(content, { from: from }), diagnostics);
        meta.namespace = config.files[from].namespace || meta.namespace;
        return meta;
    }, fs);
    var resolver = new postcss_resolver_1.StylableResolver(fileProcessor, requireModule);
    return { resolver: resolver, requireModule: requireModule, fileProcessor: fileProcessor };
}
exports.generateInfra = generateInfra;
function createTransformer(config, diagnostics) {
    if (diagnostics === void 0) { diagnostics = new diagnostics_1.Diagnostics(); }
    var _a = generateInfra(config, diagnostics), requireModule = _a.requireModule, fileProcessor = _a.fileProcessor;
    return new stylable_transformer_1.StylableTransformer({
        fileProcessor: fileProcessor,
        requireModule: requireModule,
        diagnostics: diagnostics,
        keepValues: false,
        optimize: config.optimize
    });
}
exports.createTransformer = createTransformer;
function generateFromMock(config, diagnostics) {
    if (diagnostics === void 0) { diagnostics = new diagnostics_1.Diagnostics(); }
    if (!path_1.isAbsolute(config.entry || '')) {
        throw new Error('entry must be absolute path: ' + config.entry);
    }
    var entry = config.entry;
    var t = createTransformer(config, diagnostics);
    var result = t.transform(t.fileProcessor.process(entry || ''));
    return result;
}
exports.generateFromMock = generateFromMock;
function createProcess(fileProcessor) {
    return function (path) { return fileProcessor.process(path); };
}
exports.createProcess = createProcess;
function createTransform(fileProcessor, requireModule) {
    return function (meta) {
        return new stylable_transformer_1.StylableTransformer({
            fileProcessor: fileProcessor,
            requireModule: requireModule,
            diagnostics: new diagnostics_1.Diagnostics(),
            keepValues: false
        }).transform(meta).meta;
    };
}
exports.createTransform = createTransform;
function generateStylableRoot(config) {
    return generateFromMock(config).meta.outputAst;
}
exports.generateStylableRoot = generateStylableRoot;
function generateStylableExports(config) {
    return generateFromMock(config).exports;
}
exports.generateStylableExports = generateStylableExports;
function createTestBundler(config) {
    config.trimWS = true;
    if (!config.usedFiles) {
        throw new Error('usedFiles is not optional in generateStylableOutput');
    }
    var _a = memory_minimal_fs_1.createMinimalFS(config), fs = _a.fs, requireModule = _a.requireModule;
    var stylable = new stylable_1.Stylable('/', fs, requireModule, '--', function (meta, path) {
        meta.namespace = config.files[path].namespace || meta.namespace;
        return meta;
    });
    return new bundle_1.Bundler(stylable);
}
exports.createTestBundler = createTestBundler;
function generateStylableOutput(config) {
    config.trimWS = true;
    if (!config.usedFiles) {
        throw new Error('usedFiles is not optional in generateStylableOutput');
    }
    var bundler = createTestBundler(config);
    config.usedFiles.forEach(function (path) { return bundler.addUsedFile(path); });
    return bundler.generateCSS();
    // return bundle(config.usedFiles, resolver, createProcess(fileProcessor),
    //               createTransform(fileProcessor, requireModule), (_ctx: string, path: string) => path).css;
}
exports.generateStylableOutput = generateStylableOutput;
//# sourceMappingURL=generate-test-util.js.map