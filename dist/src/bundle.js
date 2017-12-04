"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var postcss = require("postcss");
var stylable_utils_1 = require("./stylable-utils");
var value_template_1 = require("./value-template");
var Bundler = /** @class */ (function () {
    function Bundler(stylable) {
        this.stylable = stylable;
        this.themeAcc = {};
        this.outputCSS = [];
    }
    Bundler.prototype.addUsedFile = function (path) {
        var entryIndex = this.outputCSS.length;
        var entryMeta = this.process(path);
        this.aggregateTheme(entryMeta, entryIndex, this.themeAcc);
        this.outputCSS.push(entryMeta.source);
    };
    Bundler.prototype.getDependencyPaths = function (_a) {
        var _b = _a === void 0 ? { entries: this.outputCSS, themeEntries: this.themeAcc } : _a, entries = _b.entries, themeEntries = _b.themeEntries;
        var results = entries.concat();
        var themePaths = Object.keys(themeEntries);
        themePaths.reverse().forEach(function (themePath) {
            var _a = themeEntries[themePath], index = _a.index, path = _a.path;
            results.splice(index + 1, 0, path);
        });
        return results;
    };
    Bundler.prototype.getUsedFilePaths = function () {
        return this.getDependencyPaths({ entries: this.outputCSS, themeEntries: {} });
    };
    Bundler.prototype.generateCSS = function (usedSheetPaths, onBeforePrint) {
        var _this = this;
        // collect stylesheet meta list
        var outputMetaList;
        var themeEntries = this.themeAcc;
        if (!usedSheetPaths) {
            usedSheetPaths = this.getDependencyPaths({ entries: this.outputCSS, themeEntries: {} });
            outputMetaList = this.getDependencyPaths().map(function (path) { return _this.process(path); });
        }
        else {
            themeEntries = {};
            usedSheetPaths.forEach(function (path, index) { return _this.aggregateTheme(_this.process(path), index, themeEntries); });
            outputMetaList = this.getDependencyPaths({
                entries: usedSheetPaths, themeEntries: themeEntries
            }).map(function (path) { return _this.process(path); });
        }
        var outputPaths = outputMetaList.map(function (meta) { return meta.source; });
        // index each output entry position
        var pathToIndex = outputMetaList.reduce(function (acc, meta, index) {
            acc[meta.source] = index;
            return acc;
        }, {});
        // clean unused and add overrides
        outputMetaList = outputMetaList.map(function (entryMeta) {
            entryMeta = _this.transform(entryMeta);
            _this.cleanUnused(entryMeta, outputPaths);
            _this.applyOverrides(entryMeta, pathToIndex, themeEntries);
            return entryMeta;
        });
        // emit output CSS
        return outputMetaList.reverse()
            .map(function (meta) {
            if (onBeforePrint) {
                onBeforePrint(meta);
            }
            return meta.outputAst.toString();
        })
            .filter(function (entryCSS) { return !!entryCSS; })
            .join('\n');
    };
    Bundler.prototype.process = function (fullpath) {
        return this.stylable.process(fullpath);
    };
    Bundler.prototype.transform = function (meta) {
        return this.stylable.transform(meta).meta;
    };
    Bundler.prototype.resolvePath = function (ctx, path) {
        return this.stylable.resolvePath(ctx, path);
    };
    Bundler.prototype.aggregateTheme = function (entryMeta, entryIndex, themeEntries) {
        var _this = this;
        var aggregateDependencies = function (srcMeta, overrideVars, importPath) {
            srcMeta.imports.forEach(function (importRequest) {
                if (!importRequest.from.match(/.css$/)) {
                    return;
                }
                var isImportTheme = !!importRequest.theme;
                var themeOverrideData = themeEntries[importRequest.from]; // some entry already imported as theme
                var importMeta = _this.process(importRequest.from);
                if (importPath.indexOf(importMeta.source) !== -1) {
                    return;
                }
                var themeOverrideVars;
                if (isImportTheme) {
                    themeOverrideData = themeEntries[importRequest.from] =
                        themeOverrideData || { index: entryIndex, path: importMeta.source, overrideDefs: [] };
                    themeOverrideVars = generateThemeOverrideVars(srcMeta, importRequest, overrideVars);
                    if (themeOverrideVars) {
                        themeOverrideData.overrideDefs.unshift({
                            overrideRoot: entryMeta,
                            overrideVars: themeOverrideVars
                        });
                    }
                }
                if (themeOverrideData) {
                    themeOverrideData.index = entryIndex;
                }
                aggregateDependencies(importMeta, themeOverrideVars || {}, importPath.concat(importMeta.source));
            });
        };
        aggregateDependencies(entryMeta, {}, [entryMeta.source]);
    };
    Bundler.prototype.cleanUnused = function (meta, usedPaths) {
        var _this = this;
        meta.imports.forEach(function (importRequest) {
            return stylable_utils_1.removeUnusedRules(meta.outputAst, meta, importRequest, usedPaths, _this.resolvePath.bind(_this));
        });
    };
    // resolveFrom(_import){
    //     return {
    //         ..._import
    //         from: this.resolvePath(_import.from)
    //     }
    // }
    Bundler.prototype.applyOverrides = function (entryMeta, pathToIndex, themeEntries) {
        var _this = this;
        var outputAST = entryMeta.outputAst;
        var outputRootSelector = getSheetNSRootSelector(entryMeta, this.stylable.delimiter);
        var isTheme = !!themeEntries[entryMeta.source];
        // get overrides from each overridden stylesheet
        var overrideInstructions = Object.keys(entryMeta.mappedSymbols)
            .reduce(function (acc, symbolId) {
            var symbol = entryMeta.mappedSymbols[symbolId];
            var varSourceId = symbolId;
            var originMeta = entryMeta;
            if (symbol._kind === 'import') {
                var resolve = _this.stylable.resolver.deepResolve(symbol);
                if (resolve && resolve._kind === 'css' && resolve.symbol) {
                    varSourceId = resolve.symbol.name;
                    originMeta = resolve.meta;
                }
                else {
                    // TODO: maybe warn
                    return acc;
                }
            }
            var overridePath = originMeta.source;
            var themeEntry = themeEntries[overridePath];
            if (themeEntry) {
                themeEntry.overrideDefs.forEach(function (overrideDef) {
                    if (overrideDef.overrideVars[varSourceId]) {
                        var overridePathSource = overrideDef.overrideRoot.source;
                        var overrideIndex = pathToIndex[overridePathSource];
                        if (!acc.overrideVarsPerDef[overridePathSource]) {
                            acc.overrideVarsPerDef[overridePathSource] = (_a = {},
                                _a[symbolId] = overrideDef.overrideVars[varSourceId],
                                _a);
                        }
                        else {
                            acc.overrideVarsPerDef[overridePathSource][symbolId] =
                                overrideDef.overrideVars[varSourceId];
                        }
                        acc.overrideDefs[overrideIndex] = overrideDef;
                    }
                    var _a;
                });
            }
            return acc;
        }, { overrideDefs: [], overrideVarsPerDef: {} });
        // sort override instructions according to insertion order
        var sortedOverrides = [];
        for (var _i = 0, _a = overrideInstructions.overrideDefs; _i < _a.length; _i++) {
            var overrideDef = _a[_i];
            if (overrideDef) {
                var rootSelector = getSheetNSRootSelector(overrideDef.overrideRoot, this.stylable.delimiter);
                var overrideVars = overrideInstructions.overrideVarsPerDef[overrideDef.overrideRoot.source];
                sortedOverrides.push({ rootSelector: rootSelector, overrideVars: overrideVars });
            }
        }
        // generate override rulesets
        var overrideRulesets = [];
        outputAST.walkRules(function (srcRule) {
            sortedOverrides.forEach(function (_a) {
                var rootSelector = _a.rootSelector, overrideVars = _a.overrideVars;
                var overrideSelector = srcRule.selector;
                if (isTheme) {
                    overrideSelector =
                        overrideSelector.replace(new RegExp(outputRootSelector), rootSelector); // scope override
                    overrideSelector = (overrideSelector === srcRule.selector) ?
                        '.' + rootSelector + ' ' + overrideSelector :
                        overrideSelector; // scope globals
                }
                else {
                    var isNestedSep = outputRootSelector !== rootSelector ? ' ' : '';
                    overrideSelector = '.' + rootSelector + isNestedSep + overrideSelector; // none theme selector
                }
                var ruleOverride = postcss.rule({ selector: overrideSelector });
                srcRule.walkDecls(function (decl) {
                    var overriddenValue = value_template_1.valueReplacer(decl.sourceValue, entryMeta.mappedSymbols, function (_value, name, _match) {
                        if (overrideVars[name]) {
                            return overrideVars[name];
                        }
                        var symbol = entryMeta.mappedSymbols[name];
                        if (symbol._kind === 'var') {
                            return symbol.text;
                        }
                        else if (symbol._kind === 'import') {
                            var resolvedValue = _this.stylable.resolver.resolveVarValue(entryMeta, name);
                            if (resolvedValue) {
                                return resolvedValue;
                            }
                            else {
                                return 'unresolved imported var value ' + name;
                            }
                        }
                        return 'invalid value ' + name + ' of type ' + symbol._kind;
                    });
                    if (decl.value !== overriddenValue) {
                        ruleOverride.append(postcss.decl({ prop: decl.prop, value: overriddenValue }));
                    }
                });
                if (ruleOverride.nodes && ruleOverride.nodes.length) {
                    overrideRulesets.push({ ruleOverride: ruleOverride, srcRule: srcRule });
                }
            });
        });
        overrideRulesets.reverse().forEach(function (_a) {
            var ruleOverride = _a.ruleOverride, srcRule = _a.srcRule;
            outputAST.insertAfter(srcRule, ruleOverride);
        });
    };
    return Bundler;
}());
exports.Bundler = Bundler;
function getSheetNSRootSelector(meta, delimiter) {
    return meta.namespace + delimiter + meta.root;
}
function generateThemeOverrideVars(srcMeta, _a, overrides) {
    var srcImportOverrides = _a.overrides, themePath = _a.from;
    // get override vars from import
    var importOverrides = srcImportOverrides.reduce(function (acc, dec) {
        acc[dec.prop] = dec.value;
        return acc;
    }, {});
    // add context override
    for (var overrideProp in overrides) {
        var symbol = srcMeta.mappedSymbols[overrideProp];
        if (symbol && symbol._kind === 'import' &&
            symbol.import.from === themePath && !importOverrides[overrideProp]) {
            importOverrides[symbol.name] = overrides[overrideProp];
        }
        else {
            // TODO: warn
        }
    }
    return Object.keys(importOverrides).length ? importOverrides : null;
}
// createAllModulesRelations
// expendRelationsToDeepImports
// forEachRelationsExtractOverrides
// forEachRelationsPrintWithOverrides
//# sourceMappingURL=bundle.js.map