"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
function matchCSSMatchers(chai, util) {
    var flag = util.flag;
    chai.Assertion.addMethod('matchCSS', function (css) {
        var element = flag(this, 'object');
        if (!Array.isArray(css)) {
            css = [css];
        }
        if (!Array.isArray(element)) {
            element = [element];
        }
        // TODO: better reporting.
        chai_1.expect(element.length).to.equal(css.length);
        css.forEach(function (chunk, index) { return chai_1.expect(element[index]).to.eql(chunk); });
    });
}
exports.matchCSSMatchers = matchCSSMatchers;
//# sourceMappingURL=match-css.js.map