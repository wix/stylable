"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Diagnostics = /** @class */ (function () {
    function Diagnostics(reports) {
        if (reports === void 0) { reports = []; }
        this.reports = reports;
    }
    Diagnostics.prototype.add = function (type, node, message, options) {
        if (options === void 0) { options = {}; }
        this.reports.push({ type: type, node: node, message: message, options: options });
    };
    Diagnostics.prototype.error = function (node, message, options) {
        this.add('error', node, message, options);
    };
    Diagnostics.prototype.warn = function (node, message, options) {
        this.add('warning', node, message, options);
    };
    return Diagnostics;
}());
exports.Diagnostics = Diagnostics;
//# sourceMappingURL=diagnostics.js.map