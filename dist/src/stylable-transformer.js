"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var native_pseudos_1 = require("./native-pseudos");
var parser_1 = require("./parser");
var postcss_resolver_1 = require("./postcss-resolver");
var selector_utils_1 = require("./selector-utils");
var stylable_optimizer_1 = require("./stylable-optimizer");
var stylable_utils_1 = require("./stylable-utils");
var stylable_value_parsers_1 = require("./stylable-value-parsers");
var value_template_1 = require("./value-template");
var cloneDeep = require('lodash.clonedeep');
var valueParser = require('postcss-value-parser');
var StylableTransformer = /** @class */ (function () {
    function StylableTransformer(options) {
        this.diagnostics = options.diagnostics;
        this.delimiter = options.delimiter || '--';
        this.keepValues = options.keepValues || false;
        this.optimize = options.optimize || false;
        this.fileProcessor = options.fileProcessor;
        this.resolver = new postcss_resolver_1.StylableResolver(options.fileProcessor, options.requireModule);
    }
    StylableTransformer.prototype.transform = function (meta) {
        var _this = this;
        var ast = meta.outputAst = meta.ast.clone();
        var metaExports = {};
        var keyframeMapping = this.scopeKeyframes(meta);
        if (!this.keepValues) {
            ast.walkAtRules(/media$/, function (atRule) {
                atRule.sourceParams = atRule.params;
                atRule.params = _this.replaceValueFunction(atRule, atRule.params, meta);
            });
        }
        ast.walkRules(function (rule) { return _this.appendMixins(ast, rule); });
        ast.walkRules(function (rule) {
            if (!_this.isChildOfAtRule(rule, 'keyframes')) {
                rule.selector = _this.scopeRule(meta, rule, metaExports);
            }
            if (!_this.keepValues) {
                rule.walkDecls(function (decl) {
                    decl.sourceValue = decl.value;
                    decl.value = _this.replaceValueFunction(decl, decl.value, meta);
                });
            }
        });
        this.exportRootClass(meta, metaExports);
        this.exportLocalVars(meta, metaExports);
        this.exportKeyframes(keyframeMapping, metaExports);
        meta.transformDiagnostics = this.diagnostics;
        if (this.optimize) {
            stylable_optimizer_1.removeSTDirective(ast);
        }
        return {
            meta: meta,
            exports: metaExports
        };
    };
    StylableTransformer.prototype.isChildOfAtRule = function (rule, atRuleName) {
        return rule.parent && rule.parent.type === 'atrule' && rule.parent.name === atRuleName;
    };
    StylableTransformer.prototype.exportLocalVars = function (meta, metaExports) {
        var _this = this;
        meta.vars.forEach(function (varSymbol) {
            if (metaExports[varSymbol.name]) {
                _this.diagnostics.warn(varSymbol.node, "symbol '" + varSymbol.name + "' is already in use", { word: varSymbol.name });
            }
            else {
                var value = _this.resolver.resolveVarValue(meta, varSymbol.name);
                metaExports[varSymbol.name] = typeof value === 'string' ? value : varSymbol.value;
            }
        });
    };
    StylableTransformer.prototype.exportKeyframes = function (keyframeMapping, metaExports) {
        var _this = this;
        Object.keys(keyframeMapping).forEach(function (name) {
            if (metaExports[name] === keyframeMapping[name].value) {
                _this.diagnostics.warn(keyframeMapping[name].node, "symbol " + name + " is already in use", { word: name });
            }
            else {
                metaExports[name] = keyframeMapping[name].value;
            }
        });
    };
    StylableTransformer.prototype.exportRootClass = function (meta, metaExports) {
        var _this = this;
        // TODO: move the theme root composition to the process;
        var classExports = {};
        this.handleClass(meta, {
            type: 'class',
            name: meta.mappedSymbols[meta.root].name,
            nodes: []
        }, meta.mappedSymbols[meta.root].name, classExports);
        var scopedName = classExports[meta.mappedSymbols[meta.root].name];
        meta.imports.forEach(function (_import) {
            if (_import.theme) {
                var resolved = _this.resolver.deepResolve({
                    _kind: 'import',
                    type: 'default',
                    name: 'default',
                    import: _import
                });
                if (resolved && resolved._kind === 'css') {
                    var clsExports = {};
                    _this.exportRootClass(resolved.meta, clsExports);
                    scopedName += ' ' + clsExports[resolved.symbol.name];
                }
                else {
                    var node = stylable_utils_1.findDeclaration(_import, function (n) { return n.prop === stylable_value_parsers_1.valueMapping.from; });
                    _this.diagnostics.error(node, 'Trying to import unknown file', { word: node.value });
                }
            }
        });
        metaExports[meta.root] = scopedName;
    };
    StylableTransformer.prototype.exportClass = function (meta, name, classSymbol, metaExports) {
        var _this = this;
        var scopedName = this.scope(name, meta.namespace);
        if (!metaExports[name]) {
            var extend = classSymbol ? classSymbol[stylable_value_parsers_1.valueMapping.extends] : undefined;
            var compose = classSymbol ? classSymbol[stylable_value_parsers_1.valueMapping.compose] : undefined;
            var exportedClasses_1 = scopedName;
            if (extend && extend !== classSymbol) {
                var finalSymbol = void 0;
                var finalName = void 0;
                var finalMeta = void 0;
                if (extend._kind === 'class') {
                    finalSymbol = extend;
                    finalName = extend.name;
                    finalMeta = meta;
                }
                else if (extend._kind === 'import') {
                    var resolved = this.resolver.deepResolve(extend);
                    if (resolved && resolved._kind === 'css' && resolved.symbol) {
                        if (resolved.symbol._kind === 'class') {
                            finalSymbol = resolved.symbol;
                            finalName = resolved.symbol.name;
                            finalMeta = resolved.meta;
                        }
                        else {
                            var found = stylable_utils_1.findRule(meta.ast, '.' + classSymbol.name);
                            if (!!found) {
                                this.diagnostics.error(found, 'import is not extendable', { word: found.value });
                            }
                        }
                    }
                    else {
                        var found = stylable_utils_1.findRule(meta.ast, '.' + classSymbol.name);
                        if (found && resolved) {
                            if (!resolved.symbol) {
                                var importNode = stylable_utils_1.findDeclaration(extend.import, function (node) { return node.prop === stylable_value_parsers_1.valueMapping.named; });
                                this.diagnostics.error(importNode, "Could not resolve '" + found.value + "'", { word: found.value });
                            }
                            else {
                                this.diagnostics.error(found, 'JS import is not extendable', { word: found.value });
                            }
                        }
                        else {
                            var importNode = stylable_utils_1.findDeclaration(extend.import, function (node) { return node.prop === stylable_value_parsers_1.valueMapping.from; });
                            this.diagnostics.error(importNode, "Imported file '" + extend.import.from + "' not found", { word: importNode.value });
                        }
                    }
                }
                if (finalSymbol && finalName && finalMeta && !finalSymbol[stylable_value_parsers_1.valueMapping.root]) {
                    var classExports = {};
                    this.handleClass(finalMeta, { type: 'class', name: finalName, nodes: [] }, finalName, classExports);
                    if (classExports[finalName]) {
                        exportedClasses_1 += ' ' + classExports[finalName];
                    }
                    else {
                        console.error("something went wrong when exporting '" + finalName + "', " +
                            "please file an issue in stylable. With specific use case");
                    }
                }
            }
            if (compose) {
                compose.forEach(function (symbol) {
                    var finalName;
                    var finalMeta;
                    if (symbol._kind === 'class') {
                        finalName = symbol.name;
                        finalMeta = meta;
                    }
                    else if (symbol._kind === 'import') {
                        var resolved = _this.resolver.deepResolve(symbol);
                        if (resolved && resolved._kind === 'css' && resolved.symbol) {
                            if (resolved.symbol._kind === 'class') {
                                finalName = resolved.symbol.name;
                                finalMeta = resolved.meta;
                            }
                            else {
                                // TODO2: warn second phase
                            }
                        }
                        else {
                            // TODO2: warn second phase
                        }
                    }
                    else {
                        // TODO2: warn second phase
                    }
                    if (finalName && finalMeta) {
                        var classExports = {};
                        _this.handleClass(finalMeta, { type: 'class', name: finalName, nodes: [] }, finalName, classExports);
                        if (classExports[finalName]) {
                            exportedClasses_1 += ' ' + classExports[finalName];
                        }
                        else {
                            // TODO2: warn second phase
                        }
                    }
                });
            }
            metaExports[name] = exportedClasses_1;
        }
        return scopedName;
    };
    StylableTransformer.prototype.appendMixins = function (root, rule) {
        var _this = this;
        if (!rule.mixins || rule.mixins.length === 0) {
            return;
        }
        rule.mixins.forEach(function (mix) {
            var resolvedMixin = _this.resolver.deepResolve(mix.ref);
            if (resolvedMixin) {
                if (resolvedMixin._kind === 'js') {
                    if (typeof resolvedMixin.symbol === 'function') {
                        var mixinRoot = null;
                        try {
                            var res = resolvedMixin.symbol(mix.mixin.options.map(function (v) { return v.value; }));
                            mixinRoot = parser_1.cssObjectToAst(res).root;
                        }
                        catch (e) {
                            _this.diagnostics.error(rule, 'could not apply mixin: ' + e, { word: mix.mixin.type });
                            return;
                        }
                        stylable_utils_1.mergeRules(mixinRoot, rule, _this.diagnostics);
                    }
                    else {
                        _this.diagnostics.error(rule, 'js mixin must be a function', { word: mix.mixin.type });
                    }
                }
                else {
                    var resolvedClass = _this.resolver.deepResolve(mix.ref);
                    if (resolvedClass && resolvedClass.symbol && resolvedClass._kind === 'css') {
                        if (resolvedClass.symbol[stylable_value_parsers_1.valueMapping.root]) {
                            var importNode = stylable_utils_1.findDeclaration(mix.ref.import, function (node) { return node.prop === stylable_value_parsers_1.valueMapping.default; });
                            _this.diagnostics.error(importNode, "'" + importNode.value + "' is a stylesheet and cannot be used as a mixin", { word: importNode.value });
                        }
                        stylable_utils_1.mergeRules(stylable_utils_1.createClassSubsetRoot(resolvedClass.meta.ast, '.' + resolvedClass.symbol.name), rule, _this.diagnostics);
                    }
                    else {
                        var importNode = stylable_utils_1.findDeclaration(mix.ref.import, function (node) { return node.prop === stylable_value_parsers_1.valueMapping.named; });
                        _this.diagnostics.error(importNode, 'import mixin does not exist', { word: importNode.value });
                    }
                }
            }
            else if (mix.ref._kind === 'class') {
                stylable_utils_1.mergeRules(stylable_utils_1.createClassSubsetRoot(root, '.' + mix.ref.name), rule, _this.diagnostics);
            }
        });
        rule.walkDecls(stylable_value_parsers_1.valueMapping.mixin, function (node) { return node.remove(); });
    };
    StylableTransformer.prototype.replaceValueFunction = function (node, value, meta) {
        var _this = this;
        return value_template_1.valueReplacer(value, {}, function (_value, name, match) {
            var _a = _this.resolver.resolveVarValueDeep(meta, name), resolvedValue = _a.value, next = _a.next;
            if (next && next._kind === 'js') {
                _this.diagnostics.error(node, "\"" + name + "\" is a mixin and cannot be used as a var", { word: name });
            }
            else if (next && next.symbol && next.symbol._kind === 'class') {
                _this.diagnostics.error(node, "\"" + name + "\" is a stylesheet and cannot be used as a var", { word: name });
            }
            else if (!resolvedValue) {
                var importIndex = meta.imports.findIndex(function (imprt) { return !!imprt.named[name]; });
                if (importIndex !== -1) {
                    var correctNode = stylable_utils_1.findDeclaration(meta.imports[importIndex], function (n) { return n.prop === stylable_value_parsers_1.valueMapping.named; });
                    if (correctNode) {
                        _this.diagnostics.error(correctNode, "cannot find export '" + name + "' in '" + meta.imports[importIndex].fromRelative + "'", { word: name });
                    }
                    else {
                        // catched in the process step.
                    }
                }
            }
            return typeof resolvedValue === 'string' ? resolvedValue : match;
        });
    };
    StylableTransformer.prototype.scopeKeyframes = function (meta) {
        var _this = this;
        var root = meta.outputAst;
        var keyframesExports = {};
        root.walkAtRules(/keyframes$/, function (atRule) {
            var name = atRule.params;
            if (!!~stylable_utils_1.reservedKeyFrames.indexOf(name)) {
                _this.diagnostics.error(atRule, "keyframes " + name + " is reserved", { word: name });
            }
            if (!keyframesExports[name]) {
                keyframesExports[name] = {
                    value: _this.scope(name, meta.namespace),
                    node: atRule
                };
            }
            atRule.params = keyframesExports[name].value;
        });
        root.walkDecls(/animation$|animation-name$/, function (decl) {
            var parsed = valueParser(decl.value);
            parsed.nodes.forEach(function (node) {
                var alias = keyframesExports[node.value] && keyframesExports[node.value].value;
                if (node.type === 'word' && Boolean(alias)) {
                    node.value = alias;
                }
            });
            decl.value = parsed.toString();
        });
        return keyframesExports;
    };
    StylableTransformer.prototype.resolveSelectorElements = function (meta, selector) {
        return this.scopeSelector(meta, selector, {}, true, true).elements;
    };
    StylableTransformer.prototype.scopeSelector = function (meta, selector, metaExports, scopeRoot, calcPaths, rule) {
        var _this = this;
        if (scopeRoot === void 0) { scopeRoot = true; }
        if (calcPaths === void 0) { calcPaths = false; }
        var current = meta;
        var symbol = null;
        var nestedSymbol;
        var originSymbol;
        var selectorAst = selector_utils_1.parseSelector(selector);
        var addedSelectors = [];
        var elements = selectorAst.nodes.map(function (selectorNode) {
            var selectorElements = [];
            selector_utils_1.traverseNode(selectorNode, function (node) {
                var name = node.name, type = node.type;
                if (calcPaths && type === 'class' || type === 'element' || type === 'pseudo-element') {
                    selectorElements.push({
                        name: name,
                        type: type,
                        resolved: _this.resolver.resolveExtends(current, name)
                    });
                }
                if (type === 'selector' || type === 'spacing' || type === 'operator') {
                    if (nestedSymbol) {
                        symbol = nestedSymbol;
                        nestedSymbol = null;
                    }
                    else {
                        current = meta;
                        symbol = meta.classes[meta.root];
                        originSymbol = symbol;
                    }
                }
                else if (type === 'class') {
                    var next = _this.handleClass(current, node, name, metaExports);
                    originSymbol = current.classes[name];
                    symbol = next.symbol;
                    current = next.meta;
                }
                else if (type === 'element') {
                    var next = _this.handleElement(current, node, name);
                    originSymbol = current.elements[name];
                    symbol = next.symbol;
                    current = next.meta;
                }
                else if (type === 'pseudo-element') {
                    var next = _this.handlePseudoElement(current, node, name, selectorNode, addedSelectors, rule);
                    symbol = next.symbol;
                    current = next.meta;
                }
                else if (type === 'pseudo-class') {
                    current = _this.handlePseudoClass(current, node, name, symbol, meta, originSymbol, rule);
                }
                else if (type === 'nested-pseudo-class') {
                    if (name === 'global') {
                        node.type = 'selector';
                        return true;
                    }
                    nestedSymbol = symbol;
                }
                /* do nothing */
                return undefined;
            });
            return selectorElements;
        });
        this.addAdditionalSelectors(addedSelectors, selectorAst);
        if (scopeRoot) {
            this.applyRootScoping(meta, selectorAst);
        }
        return {
            current: current,
            symbol: symbol,
            selectorAst: selectorAst,
            elements: elements,
            selector: selector_utils_1.stringifySelector(selectorAst)
        };
    };
    StylableTransformer.prototype.addAdditionalSelectors = function (addedSelectors, selectorAst) {
        addedSelectors.forEach(function (s) {
            var clone = cloneDeep(s.selectorNode);
            var i = s.selectorNode.nodes.indexOf(s.node);
            if (i === -1) {
                throw new Error('not supported inside nested classes');
            }
            else {
                clone.nodes[i].value = s.customElementChunk;
            }
            selectorAst.nodes.push(clone);
        });
    };
    StylableTransformer.prototype.applyRootScoping = function (meta, selectorAst) {
        var scopedRoot = meta.mappedSymbols[meta.root][stylable_value_parsers_1.valueMapping.global] ||
            this.scope(meta.root, meta.namespace);
        selectorAst.nodes.forEach(function (selector) {
            var first = selector.nodes[0];
            if (first && first.type === 'selector' && first.name === 'global') {
                return;
            }
            // -st-global can make anther global inside root
            if (first && first.nodes === scopedRoot) {
                return;
            }
            if (first && first.before && first.before === '.' + scopedRoot) {
                return;
            }
            if (!first || (first.name !== scopedRoot)) {
                selector.nodes = [
                    typeof scopedRoot !== 'string' ?
                        { type: 'selector', nodes: scopedRoot, name: 'global' } :
                        { type: 'class', name: scopedRoot, nodes: [] },
                    { type: 'spacing', value: ' ', name: '', nodes: [] }
                ].concat(selector.nodes);
            }
        });
    };
    StylableTransformer.prototype.scopeRule = function (meta, rule, metaExports) {
        return this.scopeSelector(meta, rule.selector, metaExports, true, false, rule).selector;
    };
    StylableTransformer.prototype.handleClass = function (meta, node, name, metaExports) {
        var symbol = meta.classes[name];
        var extend = symbol ? symbol[stylable_value_parsers_1.valueMapping.extends] : undefined;
        if (!extend && symbol && symbol.alias) {
            var next_1 = this.resolver.deepResolve(symbol.alias);
            if (next_1 && next_1._kind === 'css' && next_1.symbol && next_1.symbol._kind === 'class') {
                var globalMappedNodes_1 = next_1.symbol[stylable_value_parsers_1.valueMapping.global];
                if (globalMappedNodes_1) {
                    node.before = '';
                    node.type = 'selector';
                    node.nodes = globalMappedNodes_1;
                }
                else {
                    node.name = this.exportClass(next_1.meta, next_1.symbol.name, next_1.symbol, metaExports);
                }
                if (next_1.symbol[stylable_value_parsers_1.valueMapping.extends]) {
                    next_1 = this.resolver.deepResolve(next_1.symbol[stylable_value_parsers_1.valueMapping.extends]);
                    if (next_1 && next_1._kind === 'css') {
                        return next_1;
                    }
                }
                else {
                    return next_1;
                }
            }
            else {
                this.diagnostics.error(symbol.alias.import.rule, 'Trying to import unknown alias', { word: symbol.alias.name });
            }
        }
        var scopedName = '';
        var globalScopedSelector = '';
        var globalMappedNodes = symbol && symbol[stylable_value_parsers_1.valueMapping.global];
        if (globalMappedNodes) {
            globalScopedSelector = selector_utils_1.stringifySelector({ type: 'selector', name: '', nodes: globalMappedNodes });
        }
        else {
            scopedName = this.exportClass(meta, name, symbol, metaExports);
        }
        var next = this.resolver.resolve(extend);
        if (next && next._kind === 'css' && next.symbol && next.symbol._kind === 'class') {
            node.before = globalScopedSelector || '.' + scopedName;
            var mappedClassNodes = next.symbol[stylable_value_parsers_1.valueMapping.global];
            if (mappedClassNodes) {
                node.type = 'selector';
                node.nodes = mappedClassNodes;
            }
            else {
                node.name = this.scope(next.symbol.name, next.meta.namespace);
            }
            return next;
        }
        if (extend && extend._kind === 'class') {
            node.before = globalScopedSelector || '.' + scopedName;
            if (extend === symbol && extend.alias) {
                var next_2 = this.resolver.deepResolve(extend.alias);
                if (next_2 && next_2._kind === 'css') {
                    if (next_2.symbol._kind === 'class' && next_2.symbol[stylable_value_parsers_1.valueMapping.global]) {
                        node.before = '';
                        node.type = 'selector';
                        node.nodes = next_2.symbol[stylable_value_parsers_1.valueMapping.global] || [];
                    }
                    else {
                        node.name = this.scope(next_2.symbol.name, next_2.meta.namespace);
                    }
                    // node.name = (next.symbol as ClassSymbol)[valueMapping.global] ||
                    //             this.scope(next.symbol.name, next.meta.namespace);
                    return next_2;
                }
            }
            else {
                node.name = this.scope(extend.name, meta.namespace);
            }
        }
        else {
            if (globalScopedSelector) {
                node.before = '';
                node.type = 'selector';
                node.nodes = symbol[stylable_value_parsers_1.valueMapping.global] || [];
            }
            else {
                node.name = scopedName;
            }
        }
        return { _kind: 'css', meta: meta, symbol: symbol };
    };
    StylableTransformer.prototype.handleElement = function (meta, node, name) {
        var tRule = meta.elements[name];
        var extend = tRule ? meta.mappedSymbols[name] : undefined;
        var next = this.resolver.resolve(extend);
        if (next && next._kind === 'css') {
            if (next.symbol._kind === 'class' && next.symbol[stylable_value_parsers_1.valueMapping.global]) {
                node.before = '';
                node.type = 'selector';
                node.nodes = next.symbol[stylable_value_parsers_1.valueMapping.global] || [];
            }
            else {
                node.type = 'class';
                node.name = this.scope(next.symbol.name, next.meta.namespace);
            }
            // node.name = (next.symbol as ClassSymbol)[valueMapping.global] ||
            //             this.scope(next.symbol.name, next.meta.namespace);
            return next;
        }
        return { meta: meta, symbol: tRule };
    };
    StylableTransformer.prototype.handlePseudoElement = function (meta, node, name, selectorNode, addedSelectors, rule) {
        var next;
        var customSelector = meta.customSelectors[':--' + name];
        if (customSelector) {
            var rootRes = this.scopeSelector(meta, '.root', {}, false);
            var res = this.scopeSelector(meta, customSelector, {}, false);
            var rootEg_1 = new RegExp('^\\s*' + rootRes.selector.replace(/\./, '\\.') + '\\s*');
            var selectors = res.selectorAst.nodes.map(function (sel) { return selector_utils_1.stringifySelector(sel).trim().replace(rootEg_1, ''); });
            if (selectors[0]) {
                node.type = 'invalid'; /*just take it */
                node.before = ' ';
                node.value = selectors[0];
            }
            for (var i = 1 /*start from second one*/; i < selectors.length; i++) {
                addedSelectors.push({
                    selectorNode: selectorNode,
                    node: node,
                    customElementChunk: selectors[i]
                });
            }
            if (res.selectorAst.nodes.length === 1 && res.symbol) {
                return { _kind: 'css', meta: res.current, symbol: res.symbol };
            }
            // this is an error mode fallback
            return { _kind: 'css', meta: meta, symbol: { _kind: 'element', name: '*' } };
        }
        var symbol = meta.mappedSymbols[name];
        var current = meta;
        while (!symbol) {
            var root = current.mappedSymbols[current.root];
            next = this.resolver.resolve(root[stylable_value_parsers_1.valueMapping.extends]);
            if (next && next._kind === 'css') {
                current = next.meta;
                symbol = next.meta.mappedSymbols[name];
            }
            else {
                break;
            }
        }
        if (symbol) {
            if (symbol._kind === 'class') {
                node.type = 'class';
                node.before = symbol[stylable_value_parsers_1.valueMapping.root] ? '' : ' ';
                if (symbol[stylable_value_parsers_1.valueMapping.global]) {
                    node.type = 'selector';
                    node.nodes = symbol[stylable_value_parsers_1.valueMapping.global] || [];
                }
                else {
                    node.name = this.scope(symbol.name, current.namespace);
                }
                var extend = symbol[stylable_value_parsers_1.valueMapping.extends];
                if (extend && extend._kind === 'class' && extend.alias) {
                    extend = extend.alias;
                }
                next = this.resolver.resolve(extend);
                if (next && next._kind === 'css') {
                    return next;
                }
            }
        }
        else if (rule) {
            if (native_pseudos_1.nativePseudoElements.indexOf(name) === -1) {
                this.diagnostics.warn(rule, "unknown pseudo element \"" + name + "\"", { word: name });
            }
        }
        return { _kind: 'css', meta: current, symbol: symbol };
    };
    StylableTransformer.prototype.handlePseudoClass = function (meta, node, name, symbol, origin, originSymbol, rule) {
        var current = meta;
        var currentSymbol = symbol;
        if (symbol !== originSymbol) {
            var states = originSymbol[stylable_value_parsers_1.valueMapping.states];
            if (states && states.hasOwnProperty(name)) {
                if (states[name] === null) {
                    node.type = 'attribute';
                    node.content = this.autoStateAttrName(name, origin.namespace);
                }
                else {
                    node.type = 'invalid'; // simply concat global mapped selector - ToDo: maybe change to 'selector'
                    node.value = states[name];
                }
                return current;
            }
        }
        var found = false;
        while (current && currentSymbol) {
            if (currentSymbol && currentSymbol._kind === 'class') {
                var states = currentSymbol[stylable_value_parsers_1.valueMapping.states];
                var extend = currentSymbol[stylable_value_parsers_1.valueMapping.extends];
                if (states && states.hasOwnProperty(name)) {
                    found = true;
                    if (states[name] === null) {
                        node.type = 'attribute';
                        node.content = this.autoStateAttrName(name, current.namespace);
                    }
                    else {
                        // simply concat global mapped selector - ToDo: maybe change to 'selector'
                        node.type = 'invalid';
                        node.value = states[name];
                    }
                    break;
                }
                else if (extend) {
                    var next = this.resolver.resolve(extend);
                    if (next && next.meta) {
                        currentSymbol = next.symbol;
                        current = next.meta;
                    }
                    else {
                        break;
                    }
                }
                else {
                    break;
                }
            }
            else {
                break;
            }
        }
        if (!found && rule) {
            if (native_pseudos_1.nativePseudoClasses.indexOf(name) === -1) {
                this.diagnostics.warn(rule, "unknown pseudo class \"" + name + "\"", { word: name });
            }
        }
        return current;
    };
    // TODO: Extract to scoping utils
    StylableTransformer.prototype.autoStateAttrName = function (stateName, namespace) {
        return "data-" + namespace.toLowerCase() + "-" + stateName.toLowerCase();
    };
    StylableTransformer.prototype.cssStates = function (stateMapping, namespace) {
        var _this = this;
        return stateMapping ? Object.keys(stateMapping).reduce(function (states, key) {
            if (stateMapping[key]) {
                states[_this.autoStateAttrName(key, namespace)] = true;
            }
            return states;
        }, {}) : {};
    };
    StylableTransformer.prototype.scope = function (name, namespace, delimiter) {
        if (delimiter === void 0) { delimiter = this.delimiter; }
        return namespace ? namespace + delimiter + name : name;
    };
    return StylableTransformer;
}());
exports.StylableTransformer = StylableTransformer;
//# sourceMappingURL=stylable-transformer.js.map