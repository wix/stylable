"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var cached_process_file_1 = require("./cached-process-file");
var parser_1 = require("./parser");
var stylable_processor_1 = require("./stylable-processor");
var ResolverFactory = require('enhanced-resolve/lib/ResolverFactory');
function createInfrastructure(projectRoot, fileSystem, onProcess) {
    if (onProcess === void 0) { onProcess = function (x) { return x; }; }
    var eResolver = ResolverFactory.createResolver({
        useSyncFileSystemCalls: true,
        fileSystem: fileSystem
    });
    var fileProcessor = cached_process_file_1.cachedProcessFile(function (from, content) {
        if (!path.isAbsolute(from)) {
            from = eResolver.resolveSync({}, projectRoot, from);
        }
        return onProcess(stylable_processor_1.process(parser_1.safeParse(content, { from: from })), from);
    }, {
        readFileSync: function (moduleId) {
            if (!path.isAbsolute(moduleId)) {
                moduleId = eResolver.resolveSync({}, projectRoot, moduleId);
            }
            return fileSystem.readFileSync(moduleId, 'utf8');
        },
        statSync: function (moduleId) {
            if (!path.isAbsolute(moduleId)) {
                moduleId = eResolver.resolveSync({}, projectRoot, moduleId);
            }
            var stat = fileSystem.statSync(moduleId);
            if (!stat.mtime) {
                return {
                    mtime: new Date(0)
                };
            }
            return stat;
        }
    });
    return {
        resolvePath: function (context, moduleId) {
            if (!path.isAbsolute(moduleId) && moduleId.charAt(0) !== '.') {
                moduleId = eResolver.resolveSync({}, context, moduleId);
            }
            return moduleId;
        },
        fileProcessor: fileProcessor
    };
}
exports.createInfrastructure = createInfrastructure;
//# sourceMappingURL=create-infra-structure.js.map