"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var postcss = require("postcss");
var selector_utils_1 = require("./selector-utils");
var stylable_value_parsers_1 = require("./stylable-value-parsers");
var replaceRuleSelector = require('postcss-selector-matches/dist/replaceRuleSelector');
var cloneDeep = require('lodash.clonedeep');
exports.CUSTOM_SELECTOR_RE = /:--[\w-]+/g;
function isValidDeclaration(decl) {
    return typeof decl.value === 'string';
}
exports.isValidDeclaration = isValidDeclaration;
function transformMatchesOnRule(rule, lineBreak) {
    return replaceRuleSelector(rule, { lineBreak: lineBreak });
}
exports.transformMatchesOnRule = transformMatchesOnRule;
function mergeRules(mixinRoot, rule, diagnostics) {
    mixinRoot.walkRules(function (mixinRule) {
        var ruleSelectorAst = selector_utils_1.parseSelector(rule.selector);
        var mixinSelectorAst = selector_utils_1.parseSelector(mixinRule.selector);
        var nodes = [];
        mixinSelectorAst.nodes.forEach(function (mixinSelector) {
            ruleSelectorAst.nodes.forEach(function (ruleSelector) {
                var m = cloneDeep(mixinSelector.nodes);
                var first = m[0];
                if (first && first.type === 'invalid' && first.value === '&') {
                    m.splice(0, 1);
                }
                else if (first && first.type !== 'spacing') {
                    m.unshift({
                        type: 'spacing',
                        value: ' '
                    });
                }
                nodes.push({
                    type: 'selector',
                    before: ruleSelector.before || mixinSelector.before,
                    nodes: cloneDeep(ruleSelector.nodes, true).concat(m)
                });
            });
        });
        ruleSelectorAst.nodes = nodes;
        mixinRule.selector = selector_utils_1.stringifySelector(ruleSelectorAst);
        mixinRule.selectorAst = ruleSelectorAst;
    });
    if (mixinRoot.nodes) {
        var nextRule_1 = rule;
        var mixinEntry_1 = null;
        rule.walkDecls(stylable_value_parsers_1.valueMapping.mixin, function (decl) {
            mixinEntry_1 = decl;
        });
        if (!mixinEntry_1) {
            throw rule.error('missing mixin entry');
        }
        mixinRoot.nodes.slice().forEach(function (node) {
            if (node.type === 'decl') {
                if (isValidDeclaration(node)) {
                    rule.insertBefore(mixinEntry_1, node);
                }
                else {
                    diagnostics.warn(mixinEntry_1, "not a valid mixin declaration " + mixinEntry_1.value, { word: mixinEntry_1.value });
                }
            }
            else if (node.type === 'rule') {
                if (rule.parent.last === nextRule_1) {
                    rule.parent.append(node);
                }
                else {
                    rule.parent.insertAfter(nextRule_1, node);
                }
                var toRemove_1 = [];
                node.walkDecls(function (decl) {
                    if (!isValidDeclaration(decl)) {
                        toRemove_1.push(decl);
                        diagnostics.warn(mixinEntry_1, "not a valid mixin declaration '" + decl.prop + "', and was removed", { word: mixinEntry_1.value });
                    }
                });
                toRemove_1.forEach(function (decl) { return decl.remove(); });
                nextRule_1 = node;
            }
            else if (node.type === 'atrule') {
                throw new Error('mixins @ rules are not supported yet!');
            }
        });
    }
    return rule;
}
exports.mergeRules = mergeRules;
function createClassSubsetRoot(root, selectorPrefix) {
    var mixinRoot = postcss.root();
    var addRootDecls = true;
    root.nodes.forEach(function (node) {
        if (node.type === 'rule') {
            if (node.selector.startsWith(selectorPrefix) && node.selector.indexOf(',') === -1) {
                if (addRootDecls && node.selectorType === 'class') {
                    addRootDecls = false;
                    node.walkDecls(function (decl) {
                        mixinRoot.append(decl.clone());
                    });
                }
                else {
                    // TODO: handle complex selectors with ,
                    var clone = node.clone({
                        selector: node.selector.replace(selectorPrefix, '&')
                    });
                    // TODO: maybe delete clone.selectorAst
                    mixinRoot.append(clone);
                }
            }
        }
    });
    return mixinRoot;
}
exports.createClassSubsetRoot = createClassSubsetRoot;
function removeUnusedRules(ast, meta, _import, usedFiles, resolvePath) {
    var isUnusedImport = usedFiles.indexOf(_import.from) === -1;
    if (isUnusedImport) {
        var symbols_1 = Object.keys(_import.named).concat(_import.defaultExport);
        ast.walkRules(function (rule) {
            var shouldOutput = true;
            selector_utils_1.traverseNode(rule.selectorAst, function (node) {
                if (symbols_1.indexOf(node.name) !== -1) {
                    return shouldOutput = false;
                }
                var symbol = meta.mappedSymbols[node.name];
                if (symbol && (symbol._kind === 'class' || symbol._kind === 'element')) {
                    var extend = symbol[stylable_value_parsers_1.valueMapping.extends];
                    if (extend && extend._kind === 'import' &&
                        usedFiles.indexOf(resolvePath(meta.source, extend.import.from)) === -1) {
                        return shouldOutput = false;
                    }
                }
                return undefined;
            });
            // TODO: optimize the multiple selectors
            if (!shouldOutput && rule.selectorAst.nodes.length <= 1) {
                rule.remove();
            }
        });
    }
}
exports.removeUnusedRules = removeUnusedRules;
function findDeclaration(importNode, test) {
    var fromIndex = importNode.rule.nodes.findIndex(test);
    return importNode.rule.nodes[fromIndex];
}
exports.findDeclaration = findDeclaration;
function findRule(root, selector, test) {
    if (test === void 0) { test = function (statment) { return statment.prop === stylable_value_parsers_1.valueMapping.extends; }; }
    var found = null;
    root.walkRules(selector, function (rule) {
        var declarationIndex = rule.nodes ? rule.nodes.findIndex(test) : -1;
        if (rule.isSimpleSelector && !!~declarationIndex) {
            found = rule.nodes[declarationIndex];
        }
    });
    return found;
}
exports.findRule = findRule;
exports.reservedKeyFrames = [
    'none',
    'inherited',
    'initial',
    'unset',
    /* single-timing-function */
    'linear',
    'ease',
    'ease-in',
    'ease-in-out',
    'ease-out',
    'step-start',
    'step-end',
    'start',
    'end',
    /* single-animation-iteration-count */
    'infinite',
    /* single-animation-direction */
    'normal',
    'reverse',
    'alternate',
    'alternate-reverse',
    /* single-animation-fill-mode */
    'forwards',
    'backwards',
    'both',
    /* single-animation-play-state */
    'running',
    'paused'
];
//# sourceMappingURL=stylable-utils.js.map