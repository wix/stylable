"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var deindent = require('deindent');
var path_1 = require("path");
function createMinimalFS(config) {
    var files = config.files;
    for (var file in files) {
        if (files[file].mtime === undefined) {
            files[file].mtime = new Date();
            files[path_1.resolve(file)] = files[file];
        }
    }
    var fs = {
        readFileSync: function (path) {
            if (!files[path]) {
                throw new Error('Cannot find file: ' + path);
            }
            if (config.trimWS) {
                return deindent(files[path].content).trim();
            }
            return files[path].content;
        },
        statSync: function (path) {
            if (!files[path]) {
                throw new Error('Cannot find file: ' + path);
            }
            return {
                mtime: files[path].mtime
            };
        }
    };
    var requireModule = function require(path) {
        var _module = {
            id: path,
            exports: {}
        };
        try {
            if (!path.match(/\.js$/)) {
                path += '.js';
            }
            var fn = new Function('module', 'exports', 'require', files[path].content);
            fn(_module, _module.exports, requireModule);
        }
        catch (e) {
            throw new Error('Cannot require file: ' + path);
        }
        return _module.exports;
    };
    function resolvePath(_ctx, path) {
        return path;
    }
    return {
        fs: fs,
        requireModule: requireModule,
        resolvePath: resolvePath
    };
}
exports.createMinimalFS = createMinimalFS;
//# sourceMappingURL=memory-minimal-fs.js.map