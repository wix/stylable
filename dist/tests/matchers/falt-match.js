"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var flatten = require('flat');
var chai_1 = require("chai");
function flatMatch(chai, util) {
    var flag = util.flag;
    chai.Assertion.addMethod('flatMatch', function (obj, maxDepth) {
        if (maxDepth === void 0) { maxDepth = 5; }
        chai_1.expect(flatten(flag(this, 'object'), { maxDepth: maxDepth })).to.contain(flatten(obj));
    });
}
exports.flatMatch = flatMatch;
//# sourceMappingURL=falt-match.js.map