"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function cachedProcessFile(processor, fs) {
    var cache = {};
    function process(fullpath, ignoreCache) {
        if (ignoreCache === void 0) { ignoreCache = false; }
        var stat = fs.statSync(fullpath);
        var cached = cache[fullpath];
        if (ignoreCache || !cached || (cached && cached.stat.mtime.valueOf() !== stat.mtime.valueOf())) {
            var content = fs.readFileSync(fullpath, 'utf8');
            var value = processor(fullpath, content);
            cache[fullpath] = { value: value, stat: stat };
        }
        return cache[fullpath].value;
    }
    function add(fullpath, value) {
        cache[fullpath] = {
            value: value,
            stat: fs.statSync(fullpath)
        };
    }
    return {
        process: process,
        add: add
    };
}
exports.cachedProcessFile = cachedProcessFile;
//# sourceMappingURL=cached-process-file.js.map