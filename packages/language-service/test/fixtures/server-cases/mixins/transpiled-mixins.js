"use strict";
exports.__esModule = true;
function paramfulMixin(numParam, strParam, aliasedParam, enumParam) {
    if (numParam === void 0) { numParam = '50'; }
    return "color: red";
}
exports.paramfulMixin = paramfulMixin;
function paramlessMixin() {
    return "color: goldenrod";
}
exports.paramlessMixin = paramlessMixin;
