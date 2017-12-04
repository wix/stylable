"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tokenizer = require('css-selector-tokenizer');
function parseSelector(selector) {
    return tokenizer.parse(selector);
}
exports.parseSelector = parseSelector;
function stringifySelector(ast) {
    return tokenizer.stringify(ast);
}
exports.stringifySelector = stringifySelector;
function traverseNode(node, visitor, index, nodes) {
    if (index === void 0) { index = 0; }
    if (nodes === void 0) { nodes = [node]; }
    if (!node) {
        return;
    }
    var cNodes = node.nodes;
    var doNext = visitor(node, index, nodes);
    if (doNext === false) {
        return false;
    }
    if (doNext === true) {
        return true;
    }
    if (cNodes) {
        for (var i = 0; i < node.nodes.length; i++) {
            doNext = traverseNode(node.nodes[i], visitor, i, node.nodes);
            if (doNext === true) {
                continue;
            }
            if (doNext === false) {
                return false;
            }
        }
    }
}
exports.traverseNode = traverseNode;
function createChecker(types) {
    return function () {
        var index = 0;
        return function (node) {
            var matcher = types[index];
            if (Array.isArray(matcher)) {
                return matcher.indexOf(node.type) !== -1;
            }
            else if (matcher !== node.type) {
                return false;
            }
            if (types[index] !== node.type) {
                return false;
            }
            index++;
            return true;
        };
    };
}
exports.createChecker = createChecker;
function createRootAfterSpaceChecker() {
    var hasSpacing = false;
    var isValid = true;
    return function (node) {
        if (!node) {
            return isValid;
        }
        if (node.type === 'selector') {
            hasSpacing = false;
        }
        else if (node.type === 'spacing') {
            hasSpacing = true;
        }
        else if (node.type === 'class' && node.name === 'root' && hasSpacing) {
            isValid = false;
        }
        return isValid;
    };
}
exports.createRootAfterSpaceChecker = createRootAfterSpaceChecker;
exports.createSimpleSelectorChecker = createChecker(['selectors', 'selector', ['element', 'class']]);
function isImport(ast) {
    var selectors = ast.nodes[0];
    var selector = selectors && selectors.nodes[0];
    return selector && selector.type === 'pseudo-class' && selector.name === 'import';
}
exports.isImport = isImport;
function matchAtKeyframes(selector) {
    return selector.match(/^@keyframes\s*(.*)/);
}
exports.matchAtKeyframes = matchAtKeyframes;
function matchAtMedia(selector) {
    return selector.match(/^@media\s*(.*)/);
}
exports.matchAtMedia = matchAtMedia;
//# sourceMappingURL=selector-utils.js.map