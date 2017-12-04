"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var stylable_value_parsers_1 = require("./stylable-value-parsers");
var utils_1 = require("./utils");
var StylableResolver = /** @class */ (function () {
    function StylableResolver(fileProcessor, requireModule) {
        this.fileProcessor = fileProcessor;
        this.requireModule = requireModule;
    }
    StylableResolver.prototype.resolveVarValue = function (meta, name) {
        return this.resolveVarValueDeep(meta, name).value;
    };
    StylableResolver.prototype.resolveVarValueDeep = function (meta, name) {
        var value;
        var symbol = meta.mappedSymbols[name];
        var next;
        while (symbol) {
            if (symbol._kind === 'var' && symbol.import) {
                next = this.resolve(symbol.import);
            }
            else if (symbol._kind === 'import') {
                next = this.resolve(symbol);
            }
            else {
                break;
            }
            if (next) {
                symbol = next.symbol;
            }
            else {
                break;
            }
        }
        if (symbol && symbol._kind === 'var') {
            value = utils_1.stripQuotation(symbol.value);
        }
        else if (typeof symbol === 'string' /* only from js */) {
            value = symbol;
        }
        else {
            value = null;
        }
        return { value: value, next: next };
    };
    StylableResolver.prototype.resolveClass = function (meta, symbol) {
        return this.resolveName(meta, symbol, false);
    };
    StylableResolver.prototype.resolveElement = function (meta, symbol) {
        return this.resolveName(meta, symbol, true);
    };
    StylableResolver.prototype.resolveName = function (meta, symbol, isElement) {
        var type = isElement ? 'element' : 'class';
        var finalSymbol;
        var finalMeta;
        if (symbol._kind === type) {
            finalSymbol = symbol;
            finalMeta = meta;
        }
        else if (symbol._kind === 'import') {
            var resolved = this.deepResolve(symbol);
            if (resolved && resolved._kind === 'css' && resolved.symbol) {
                if (resolved.symbol._kind === 'class' || resolved.symbol._kind === 'element') {
                    finalSymbol = resolved.symbol;
                    finalMeta = resolved.meta;
                }
                else {
                    // TODO: warn
                }
            }
            else {
                // TODO: warn
            }
        }
        else {
            // TODO: warn
        }
        if (finalMeta && finalSymbol) {
            return {
                _kind: 'css',
                symbol: finalSymbol,
                meta: finalMeta
            };
        }
        else {
            return null;
        }
    };
    StylableResolver.prototype.resolve = function (maybeImport) {
        if (!maybeImport || maybeImport._kind !== 'import') {
            return null;
        }
        var importSymbol = maybeImport;
        var from = importSymbol.import.from;
        var symbol;
        if (from.match(/\.css$/)) {
            var meta = void 0;
            try {
                meta = this.fileProcessor.process(from);
            }
            catch (e) {
                return null;
            }
            if (importSymbol.type === 'default') {
                symbol = meta.mappedSymbols[meta.root];
            }
            else {
                symbol = meta.mappedSymbols[importSymbol.name];
            }
            return { _kind: 'css', symbol: symbol, meta: meta };
        }
        else {
            var _module = this.requireModule(from);
            if (importSymbol.type === 'default') {
                symbol = _module.default || _module;
            }
            else {
                symbol = _module[importSymbol.name];
            }
            return { _kind: 'js', symbol: symbol, meta: null };
        }
    };
    StylableResolver.prototype.deepResolve = function (maybeImport) {
        var resolved = this.resolve(maybeImport);
        while (resolved && resolved._kind === 'css' && resolved.symbol && resolved.symbol._kind === 'import') {
            resolved = this.resolve(resolved.symbol);
        }
        return resolved;
    };
    StylableResolver.prototype.resolveExtends = function (meta, className, isElement) {
        if (isElement === void 0) { isElement = false; }
        var bucket = isElement ? meta.elements : meta.classes;
        var type = isElement ? 'element' : 'class';
        if (!bucket[className]) {
            return [];
        }
        var extendPath = [];
        var resolvedClass = this.resolveName(meta, bucket[className], isElement);
        if (resolvedClass && resolvedClass._kind === 'css' && resolvedClass.symbol._kind === type) {
            var current = resolvedClass;
            var extend = resolvedClass.symbol[stylable_value_parsers_1.valueMapping.extends] || resolvedClass.symbol.alias;
            while (current) {
                extendPath.push(current);
                if (!extend) {
                    break;
                }
                var res = this.resolve(extend);
                if (res && res._kind === 'css' && (res.symbol._kind === 'element' || res.symbol._kind === 'class')) {
                    current = res;
                    extend = res.symbol[stylable_value_parsers_1.valueMapping.extends];
                }
                else {
                    break;
                }
            }
        }
        return extendPath;
    };
    return StylableResolver;
}());
exports.StylableResolver = StylableResolver;
//# sourceMappingURL=postcss-resolver.js.map