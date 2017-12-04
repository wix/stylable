"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var selector_utils_1 = require("./selector-utils");
var valueParser = require('postcss-value-parser');
exports.valueMapping = {
    from: '-st-from',
    named: '-st-named',
    default: '-st-default',
    root: '-st-root',
    states: '-st-states',
    extends: '-st-extends',
    mixin: '-st-mixin',
    variant: '-st-variant',
    compose: '-st-compose',
    theme: '-st-theme',
    global: '-st-global'
};
exports.stValues = Object.keys(exports.valueMapping).map(function (key) { return exports.valueMapping[key]; });
exports.STYLABLE_VALUE_MATCHER = /^-st-/;
exports.STYLABLE_NAMED_MATCHER = new RegExp("^" + exports.valueMapping.named + "-(.+)");
exports.SBTypesParsers = {
    '-st-root': function (value) {
        return value === 'false' ? false : true;
    },
    '-st-variant': function (value) {
        return value === 'false' ? false : true;
    },
    '-st-theme': function (value) {
        return value === 'false' ? false : true;
    },
    '-st-global': function (decl, _diagnostics) {
        // Experimental
        var selector = selector_utils_1.parseSelector(decl.value.replace(/^['"]/, '').replace(/['"]$/, ''));
        return selector.nodes[0].nodes;
    },
    '-st-states': function (value, _diagnostics) {
        if (!value) {
            return {};
        }
        var ast = valueParser(value);
        var mappedStates = {};
        ast.nodes.forEach(function (node) {
            if (node.type === 'function') {
                if (node.nodes.length === 1) {
                    mappedStates[node.value] = node.nodes[0].value.trim().replace(/\\["']/g, '"');
                }
                else {
                    // TODO: error
                }
            }
            else if (node.type === 'word') {
                mappedStates[node.value] = null;
            }
            else if (node.type === 'string') {
                // TODO: error
            }
        });
        return mappedStates;
    },
    '-st-extends': function (value) {
        return value ? value.trim() : '';
    },
    '-st-named': function (value) {
        var namedMap = {};
        if (value) {
            value.split(',').forEach(function (name) {
                var parts = name.trim().split(/\s+as\s+/);
                if (parts.length === 1) {
                    namedMap[parts[0]] = parts[0];
                }
                else if (parts.length === 2) {
                    namedMap[parts[1]] = parts[0];
                }
            });
        }
        return namedMap;
    },
    '-st-mixin': function (mixinNode, diagnostics) {
        var ast = valueParser(mixinNode.value);
        var mixins = [];
        ast.nodes.forEach(function (node) {
            if (node.type === 'function') {
                mixins.push({
                    type: node.value,
                    options: createOptions(node)
                });
            }
            else if (node.type === 'word') {
                mixins.push({
                    type: node.value,
                    options: []
                });
            }
            else if (node.type === 'string') {
                diagnostics.error(mixinNode, "value can not be a string (remove quotes?)", { word: mixinNode.value });
            }
        });
        return mixins;
    },
    '-st-compose': function (composeNode, diagnostics) {
        var ast = valueParser(composeNode.value);
        var composes = [];
        ast.walk(function (node) {
            if (node.type === 'function') {
                // TODO
            }
            else if (node.type === 'word') {
                composes.push(node.value);
            }
            else if (node.type === 'string') {
                diagnostics.error(composeNode, "value can not be a string (remove quotes?)", { word: composeNode.value });
            }
        });
        return composes;
    }
};
function groupValues(node) {
    var grouped = [];
    var current = [];
    node.nodes.forEach(function (n) {
        if (n.type === 'div') {
            grouped.push(current);
            current = [];
        }
        else {
            current.push(n);
        }
    });
    var last = grouped[grouped.length - 1];
    if ((last && last !== current && current.length) || !last && current.length) {
        grouped.push(current);
    }
    return grouped;
}
function createOptions(node) {
    return groupValues(node).map(function (nodes) { return valueParser.stringify(nodes, function (n) {
        if (n.type === 'div') {
            return null;
        }
        else if (n.type === 'string') {
            return n.value;
        }
        else {
            return undefined;
        }
    }); }).filter(function (x) { return typeof x === 'string'; }).map(function (value) { return ({ value: value }); });
}
//# sourceMappingURL=stylable-value-parsers.js.map