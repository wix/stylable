"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var postcss = require("postcss");
var diagnostics_1 = require("./diagnostics");
var selector_utils_1 = require("./selector-utils");
var stylable_utils_1 = require("./stylable-utils");
var stylable_value_parsers_1 = require("./stylable-value-parsers");
var utils_1 = require("./utils");
var value_template_1 = require("./value-template");
var hash = require('murmurhash');
var parseNamed = stylable_value_parsers_1.SBTypesParsers[stylable_value_parsers_1.valueMapping.named];
var parseMixin = stylable_value_parsers_1.SBTypesParsers[stylable_value_parsers_1.valueMapping.mixin];
var parseStates = stylable_value_parsers_1.SBTypesParsers[stylable_value_parsers_1.valueMapping.states];
var parseCompose = stylable_value_parsers_1.SBTypesParsers[stylable_value_parsers_1.valueMapping.compose];
var parseTheme = stylable_value_parsers_1.SBTypesParsers[stylable_value_parsers_1.valueMapping.theme];
var parseGlobal = stylable_value_parsers_1.SBTypesParsers[stylable_value_parsers_1.valueMapping.global];
function createEmptyMeta(root, diagnostics) {
    var reservedRootName = 'root';
    var rootSymbol = (_a = {
            _kind: 'class',
            name: reservedRootName
        },
        _a[stylable_value_parsers_1.valueMapping.root] = true,
        _a);
    return {
        ast: root,
        rawAst: root.clone(),
        root: reservedRootName,
        source: getSourcePath(root, diagnostics),
        namespace: '',
        imports: [],
        vars: [],
        keyframes: [],
        elements: {},
        classes: (_b = {},
            _b[reservedRootName] = rootSymbol,
            _b),
        mappedSymbols: (_c = {},
            _c[reservedRootName] = rootSymbol,
            _c),
        customSelectors: {},
        diagnostics: diagnostics,
        transformDiagnostics: null
    };
    var _a, _b, _c;
}
exports.createEmptyMeta = createEmptyMeta;
function getSourcePath(root, diagnostics) {
    var source = root.source.input.file || '';
    if (!source) {
        diagnostics.error(root, 'missing source filename');
    }
    else if (!path.isAbsolute(source)) {
        throw new Error('source filename is not absolute path: "' + source + '"');
    }
    return source;
}
exports.getSourcePath = getSourcePath;
function processNamespace(namespace, source) {
    return namespace + hash.v3(source); // .toString(36);
}
exports.processNamespace = processNamespace;
function process(root, diagnostics) {
    if (diagnostics === void 0) { diagnostics = new diagnostics_1.Diagnostics(); }
    return new StylableProcessor(diagnostics).process(root);
}
exports.process = process;
var StylableProcessor = /** @class */ (function () {
    function StylableProcessor(diagnostics) {
        if (diagnostics === void 0) { diagnostics = new diagnostics_1.Diagnostics(); }
        this.diagnostics = diagnostics;
    }
    StylableProcessor.prototype.process = function (root) {
        var _this = this;
        this.meta = createEmptyMeta(root, this.diagnostics);
        this.handleAtRules(root);
        var stubs = this.insertCustomSelectorsStubs();
        root.walkRules(function (rule) {
            _this.handleCustomSelectors(rule);
            _this.handleRule(rule);
            _this.handleDeclarations(rule);
        });
        stubs.forEach(function (s) { return s && s.remove(); });
        return this.meta;
    };
    StylableProcessor.prototype.insertCustomSelectorsStubs = function () {
        var _this = this;
        return Object.keys(this.meta.customSelectors).map(function (selector) {
            if (_this.meta.customSelectors[selector]) {
                var rule = postcss.rule({ selector: selector });
                _this.meta.ast.append(rule);
                return rule;
            }
            return null;
        });
    };
    StylableProcessor.prototype.handleCustomSelectors = function (rule) {
        var _this = this;
        var customSelectors = this.meta.customSelectors;
        if (rule.selector.indexOf(':--') > -1) {
            rule.selector = rule.selector.replace(stylable_utils_1.CUSTOM_SELECTOR_RE, function (extensionName, _matches, selector) {
                if (!customSelectors[extensionName]) {
                    _this.meta.diagnostics.warn(rule, "The selector '" + rule.selector + "' is undefined", { word: rule.selector });
                    return selector;
                }
                return ':matches(' + customSelectors[extensionName] + ')';
            });
            rule.selector = stylable_utils_1.transformMatchesOnRule(rule, false);
        }
    };
    StylableProcessor.prototype.handleAtRules = function (root) {
        var _this = this;
        var namespace = '';
        var toRemove = [];
        root.walkAtRules(function (atRule) {
            switch (atRule.name) {
                case 'namespace':
                    var match = atRule.params.match(/["'](.*?)['"]/);
                    match ? (namespace = match[1]) : _this.diagnostics.error(atRule, 'invalid namespace');
                    toRemove.push(atRule);
                    break;
                case 'keyframes':
                    _this.meta.keyframes.push(atRule);
                    break;
                case 'custom-selector':
                    var params = atRule.params.split(/\s/);
                    var customName = params.shift();
                    toRemove.push(atRule);
                    if (customName && customName.match(stylable_utils_1.CUSTOM_SELECTOR_RE)) {
                        _this.meta.customSelectors[customName] = atRule.params.replace(customName, '').trim();
                    }
                    else {
                        // TODO: add warn there are two types one is not valid name and the other is empty name.
                    }
                    break;
            }
        });
        toRemove.forEach(function (node) { return node.remove(); });
        namespace = namespace || utils_1.filename2varname(path.basename(this.meta.source)) || 's';
        this.meta.namespace = processNamespace(namespace, this.meta.source);
    };
    StylableProcessor.prototype.handleRule = function (rule) {
        var _this = this;
        rule.selectorAst = selector_utils_1.parseSelector(rule.selector);
        var checker = selector_utils_1.createSimpleSelectorChecker();
        var isValidRootUsage = selector_utils_1.createRootAfterSpaceChecker();
        selector_utils_1.traverseNode(rule.selectorAst, function (node, index, nodes) {
            isValidRootUsage(node);
            if (!checker(node)) {
                rule.isSimpleSelector = false;
            }
            var name = node.name, type = node.type;
            if (type === 'pseudo-class') {
                if (name === 'import') {
                    if (rule.selector === ':import') {
                        var _import = _this.handleImport(rule);
                        _this.meta.imports.push(_import);
                        _this.addImportSymbols(_import);
                        return false;
                    }
                    else {
                        _this.diagnostics.warn(rule, 'cannot define ":import" inside a complex selector');
                    }
                }
                else if (name === 'vars') {
                    if (rule.selector === ':vars') {
                        _this.addVarSymbols(rule);
                        return false;
                    }
                    else {
                        _this.diagnostics.warn(rule, 'cannot define ":vars" inside a complex selector');
                    }
                }
            }
            else if (type === 'class') {
                _this.addClassSymbolOnce(name, rule);
            }
            else if (type === 'element') {
                _this.addElementSymbolOnce(name, rule);
                var prev = nodes[index - 1];
                if (prev) {
                    /*TODO: maybe warn on element that is not a direct child div vs > div*/
                }
            }
            return void 0;
        });
        if (rule.isSimpleSelector !== false) {
            rule.isSimpleSelector = true;
            rule.selectorType = rule.selector.match(/^\./) ? 'class' : 'element';
        }
        else {
            rule.selectorType = 'complex';
        }
        if (!isValidRootUsage()) {
            this.diagnostics.warn(rule, '.root class cannot be used after spacing');
        }
    };
    StylableProcessor.prototype.checkRedeclareSymbol = function (symbolName, node) {
        var symbol = this.meta.mappedSymbols[symbolName];
        if (symbol) {
            this.diagnostics.warn(node, "redeclare symbol \"" + symbolName + "\"", { word: symbolName });
        }
    };
    StylableProcessor.prototype.addElementSymbolOnce = function (name, rule) {
        if (name.charAt(0).match(/[A-Z]/) && !this.meta.elements[name]) {
            var alias = this.meta.mappedSymbols[name];
            if (alias && alias._kind !== 'import') {
                this.checkRedeclareSymbol(name, rule);
                alias = undefined;
            }
            this.meta.elements[name] = { _kind: 'element', name: name, alias: alias };
        }
    };
    StylableProcessor.prototype.addClassSymbolOnce = function (name, rule) {
        if (!this.meta.classes[name]) {
            var alias = this.meta.mappedSymbols[name];
            if (alias && alias._kind !== 'import') {
                this.checkRedeclareSymbol(name, rule);
                alias = undefined;
            }
            this.meta.classes[name] = this.meta.mappedSymbols[name] = { _kind: 'class', name: name, alias: alias };
        }
    };
    StylableProcessor.prototype.addImportSymbols = function (importDef) {
        var _this = this;
        if (importDef.defaultExport) {
            this.checkRedeclareSymbol(importDef.defaultExport, importDef.rule);
            this.meta.mappedSymbols[importDef.defaultExport] = {
                _kind: 'import',
                type: 'default',
                name: 'default',
                import: importDef
            };
        }
        Object.keys(importDef.named).forEach(function (name) {
            _this.checkRedeclareSymbol(name, importDef.rule);
            _this.meta.mappedSymbols[name] = {
                _kind: 'import',
                type: 'named',
                name: importDef.named[name],
                import: importDef
            };
        });
    };
    StylableProcessor.prototype.addVarSymbols = function (rule) {
        var _this = this;
        rule.walkDecls(function (decl) {
            _this.checkRedeclareSymbol(decl.prop, decl);
            var importSymbol = null;
            var value = value_template_1.valueReplacer(decl.value, {}, function (_value, name, match) {
                var symbol = _this.meta.mappedSymbols[name];
                if (!symbol) {
                    _this.diagnostics.warn(decl, "cannot resolve variable value for \"" + name + "\"", { word: match });
                    return match;
                }
                else if (symbol._kind === 'import') {
                    importSymbol = symbol;
                }
                return symbol._kind === 'var' ? symbol.value : match;
            });
            var varSymbol = {
                _kind: 'var',
                name: decl.prop,
                value: value,
                text: decl.value,
                import: importSymbol,
                node: decl
            };
            _this.meta.vars.push(varSymbol);
            _this.meta.mappedSymbols[decl.prop] = varSymbol;
        });
        rule.remove();
    };
    StylableProcessor.prototype.handleDeclarations = function (rule) {
        var _this = this;
        rule.walkDecls(function (decl) {
            decl.value.replace(value_template_1.matchValue, function (match, varName) {
                if (match && !_this.meta.mappedSymbols[varName]) {
                    _this.diagnostics.warn(decl, "unknown var \"" + varName + "\"", { word: varName });
                }
                return match;
            });
            if (stylable_value_parsers_1.stValues.indexOf(decl.prop) !== -1) {
                _this.handleDirectives(rule, decl);
            }
        });
    };
    StylableProcessor.prototype.handleDirectives = function (rule, decl) {
        var _this = this;
        if (decl.prop === stylable_value_parsers_1.valueMapping.states) {
            if (rule.isSimpleSelector && rule.selectorType !== 'element') {
                this.extendTypedRule(decl, rule.selector, stylable_value_parsers_1.valueMapping.states, parseStates(decl.value, this.diagnostics));
            }
            else {
                if (rule.selectorType === 'element') {
                    this.diagnostics.warn(decl, 'cannot define pseudo states inside element selectors');
                }
                else {
                    this.diagnostics.warn(decl, 'cannot define pseudo states inside complex selectors');
                }
            }
        }
        else if (decl.prop === stylable_value_parsers_1.valueMapping.extends) {
            if (rule.isSimpleSelector) {
                var extendsRefSymbol = this.meta.mappedSymbols[decl.value];
                if (extendsRefSymbol &&
                    (extendsRefSymbol._kind === 'import' || extendsRefSymbol._kind === 'class') ||
                    decl.value === this.meta.root) {
                    this.extendTypedRule(decl, rule.selector, stylable_value_parsers_1.valueMapping.extends, extendsRefSymbol);
                }
                else {
                    this.diagnostics.warn(decl, "cannot resolve '" + stylable_value_parsers_1.valueMapping.extends + "' type for '" + decl.value + "'", { word: decl.value });
                }
            }
            else {
                this.diagnostics.warn(decl, 'cannot define "' + stylable_value_parsers_1.valueMapping.extends + '" inside a complex selector');
            }
        }
        else if (decl.prop === stylable_value_parsers_1.valueMapping.mixin) {
            var mixins_1 = [];
            parseMixin(decl, this.diagnostics).forEach(function (mixin) {
                var mixinRefSymbol = _this.meta.mappedSymbols[mixin.type];
                if (mixinRefSymbol && (mixinRefSymbol._kind === 'import' || mixinRefSymbol._kind === 'class')) {
                    mixins_1.push({
                        mixin: mixin,
                        ref: mixinRefSymbol
                    });
                }
                else {
                    _this.diagnostics.warn(decl, "unknown mixin: \"" + mixin.type + "\"", { word: mixin.type });
                }
            });
            if (rule.mixins) {
                this.diagnostics.warn(decl, "override mixin on same rule");
            }
            rule.mixins = mixins_1;
        }
        else if (decl.prop === stylable_value_parsers_1.valueMapping.compose) {
            var composes = parseCompose(decl, this.diagnostics);
            if (rule.isSimpleSelector) {
                var composeSymbols = composes.map(function (name) {
                    var extendsRefSymbol = _this.meta.mappedSymbols[name];
                    if (extendsRefSymbol &&
                        (extendsRefSymbol._kind === 'import' || extendsRefSymbol._kind === 'class')) {
                        return extendsRefSymbol;
                    }
                    else {
                        _this.diagnostics.warn(decl, "cannot resolve '" + stylable_value_parsers_1.valueMapping.compose + "' type for '" + name + "'", { word: name });
                        return null;
                    }
                }).filter(function (x) { return !!x; });
                this.extendTypedRule(decl, rule.selector, stylable_value_parsers_1.valueMapping.compose, composeSymbols);
            }
            else {
                this.diagnostics.warn(decl, 'cannot define "' + stylable_value_parsers_1.valueMapping.compose + '" inside a complex selector');
            }
        }
        else if (decl.prop === stylable_value_parsers_1.valueMapping.global) {
            if (rule.isSimpleSelector && rule.selectorType !== 'element') {
                this.setClassGlobalMapping(decl, rule);
            }
            else {
                // TODO: diagnostics - scoped on none class
            }
        }
    };
    StylableProcessor.prototype.setClassGlobalMapping = function (decl, rule) {
        var name = rule.selector.replace('.', '');
        var typedRule = this.meta.classes[name];
        if (typedRule) {
            typedRule[stylable_value_parsers_1.valueMapping.global] = parseGlobal(decl, this.diagnostics);
        }
    };
    StylableProcessor.prototype.extendTypedRule = function (node, selector, key, value) {
        var name = selector.replace('.', '');
        var typedRule = this.meta.mappedSymbols[name];
        if (typedRule && typedRule[key]) {
            this.diagnostics.warn(node, "override \"" + key + "\" on typed rule \"" + name + "\"", { word: name });
        }
        if (typedRule) {
            typedRule[key] = value;
        }
    };
    StylableProcessor.prototype.handleImport = function (rule) {
        var _this = this;
        var importObj = {
            defaultExport: '', from: '', fromRelative: '', named: {}, overrides: [], rule: rule, theme: false
        };
        rule.walkDecls(function (decl) {
            switch (decl.prop) {
                case stylable_value_parsers_1.valueMapping.from:
                    var importPath = utils_1.stripQuotation(decl.value);
                    if (!path.isAbsolute(importPath) && !importPath.startsWith('.')) {
                        importObj.fromRelative = importPath;
                        importObj.from = importPath;
                    }
                    else {
                        importObj.fromRelative = importPath;
                        importObj.from = path.resolve(path.dirname(_this.meta.source), importPath);
                    }
                    break;
                case stylable_value_parsers_1.valueMapping.default:
                    importObj.defaultExport = decl.value;
                    break;
                case stylable_value_parsers_1.valueMapping.named:
                    importObj.named = parseNamed(decl.value);
                    break;
                case stylable_value_parsers_1.valueMapping.theme:
                    importObj.theme = parseTheme(decl.value);
                    break;
                default:
                    importObj.overrides.push(decl);
                    break;
            }
        });
        if (!importObj.theme) {
            importObj.overrides.forEach(function (decl) {
                _this.diagnostics.warn(decl, "'" + decl.prop + "' css attribute cannot be used inside :import block", { word: decl.prop });
            });
        }
        if (!importObj.from) {
            this.diagnostics.error(rule, "'" + stylable_value_parsers_1.valueMapping.from + "' is missing in :import block");
        }
        rule.remove();
        return importObj;
    };
    return StylableProcessor;
}());
exports.StylableProcessor = StylableProcessor;
//# sourceMappingURL=stylable-processor.js.map