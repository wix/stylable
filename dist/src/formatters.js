"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var valueParser = require('postcss-value-parser');
function processFormatters(decl) {
    var value = valueParser(decl.value);
    processInnerFormatters(value, decl);
    return decl;
}
exports.processFormatters = processFormatters;
// collect nested formatters inside out ( f1(f2(x)) => [f2, f1] )
function processInnerFormatters(parsed, decl) {
    if (parsed.nodes) {
        parsed.nodes.forEach(function (node) {
            if (node.nodes) {
                processInnerFormatters(node, decl);
            }
        });
    }
    if (parsed.type === 'function') {
        if (!decl.formatters) {
            decl.formatters = [parsed.value];
        }
        else {
            decl.formatters.push(parsed.value);
        }
    }
}
//# sourceMappingURL=formatters.js.map