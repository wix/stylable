"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var cached_process_file_1 = require("../src/cached-process-file");
describe('cachedProcessFile', function () {
    it('return process file content', function () {
        var file = 'C:/file.txt';
        var fs = {
            readFileSync: function (fullpath) {
                if (fullpath === file) {
                    return 'content';
                }
                return '';
            },
            statSync: function () {
                return {
                    mtime: new Date(0)
                };
            }
        };
        var p = cached_process_file_1.cachedProcessFile(function (_fullpath, content) {
            return content + '!';
        }, fs);
        chai_1.expect(p.process(file)).to.equal('content!');
    });
    it('not process file if not changed', function () {
        var file = 'C:/file.txt';
        var res;
        var fs = {
            readFileSync: function (fullpath) {
                if (fullpath === file) {
                    return 'content';
                }
                return '';
            },
            statSync: function () {
                return {
                    mtime: new Date(0)
                };
            }
        };
        var p = cached_process_file_1.cachedProcessFile(function (fullpath, content) {
            var processed = { content: content, fullpath: fullpath };
            res = res ? res : processed;
            return processed;
        }, fs);
        chai_1.expect(p.process(file)).to.equal(p.process(file));
    });
    it('not read file if not changed', function () {
        var file = 'C:/file.txt';
        var count = 0;
        var fs = {
            readFileSync: function (fullpath) {
                count++;
                return fullpath;
            },
            statSync: function () {
                return {
                    mtime: new Date(0)
                };
            }
        };
        var p = cached_process_file_1.cachedProcessFile(function () { return null; }, fs);
        p.process(file);
        p.process(file);
        p.process(file);
        chai_1.expect(count).to.equal(1);
    });
    it('read file if and reprocess if changed', function () {
        var file = 'C:/file.txt';
        var readCount = 0;
        var processCount = 0;
        var fs = {
            readFileSync: function () {
                readCount++;
                return '';
            },
            statSync: function () {
                return {
                    mtime: readCount === 0 ? new Date(0) : new Date(1)
                };
            }
        };
        var p = cached_process_file_1.cachedProcessFile(function () {
            processCount++;
            return null;
        }, fs);
        p.process(file);
        p.process(file);
        chai_1.expect(readCount).to.equal(2);
        chai_1.expect(processCount).to.equal(2);
    });
    it('add stuff to ', function () {
        var file = 'C:/file.txt';
        var readCount = 0;
        var processCount = 0;
        var fs = {
            readFileSync: function () {
                readCount++;
                return '';
            },
            statSync: function () {
                return {
                    mtime: readCount === 0 ? new Date(0) : new Date(1)
                };
            }
        };
        var p = cached_process_file_1.cachedProcessFile(function () {
            processCount++;
            return null;
        }, fs);
        p.process(file);
        p.process(file);
        chai_1.expect(readCount).to.equal(2);
        chai_1.expect(processCount).to.equal(2);
    });
});
//# sourceMappingURL=cached-process-file.spec.js.map