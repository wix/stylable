"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function hasKeys(o) {
    for (var k in o) {
        if (o.hasOwnProperty(k)) {
            return true;
        }
    }
    return false;
}
exports.hasKeys = hasKeys;
exports.hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
// export function scope(name: string, namespace: string, separator: string = '-') {
//     return namespace ? namespace + separator + name : name;
// }
function stripQuotation(str) {
    return str.replace(/^['"]|['"]$/g, '');
}
exports.stripQuotation = stripQuotation;
function filename2varname(filename) {
    return string2varname(filename.replace(/(?=.*)\.\w+$/, '').replace(/\.st$/, ''));
}
exports.filename2varname = filename2varname;
function string2varname(str) {
    return str
        .replace(/[^0-9a-zA-Z_]/gm, '')
        .replace(/^[^a-zA-Z_]+/gm, '');
}
exports.string2varname = string2varname;
//# sourceMappingURL=utils.js.map