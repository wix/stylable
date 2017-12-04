"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchValue = /value\((.*?)\)/g;
function valueReplacer(value, data, onMatch, debug) {
    if (debug === void 0) { debug = false; }
    var result = replaceValue(value, data, onMatch, debug, []);
    return result + ((debug && result !== value) ? " /* " + value + " */" : '');
}
exports.valueReplacer = valueReplacer;
function replaceValue(value, data, onMatch, debug, visited) {
    var result = value.replace(exports.matchValue, function (match, name) {
        var visitedIndex = visited.indexOf(name);
        if (visitedIndex !== -1) {
            return 'cyclic value' + (debug ? "(" + (visited.slice(visitedIndex).join('>') + '>' + name) + ")" : '');
        }
        var translatedValue = onMatch(data[name], name, match) || match;
        translatedValue = replaceValue(translatedValue, data, onMatch, debug, visited.concat(name));
        return translatedValue;
    });
    return result;
}
//# sourceMappingURL=value-template.js.map