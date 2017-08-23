import * as postcss from 'postcss';
import { StylableMeta, SRule, ClassSymbol, StylableSymbol, SAtRule, SDecl, ElementSymbol } from './stylable-processor';
import { FileProcessor } from "./cached-process-file";
import { traverseNode, stringifySelector, SelectorAstNode, parseSelector } from "./selector-utils";
import { Diagnostics } from "./diagnostics";
import { valueMapping } from "./stylable-value-parsers";
import { Pojo } from "./types";
import { valueReplacer } from "./value-template";
import { StylableResolver, CSSResolve, JSResolve } from "./postcss-resolver";
import { cssObjectToAst } from "./parser";
import { createClassSubsetRoot, mergeRules } from "./stylable-utils";


const valueParser = require("postcss-value-parser");

export interface StylableResults {
    meta: StylableMeta;
    exports: Pojo<string>;
}

export interface Options {
    fileProcessor: FileProcessor<StylableMeta>
    requireModule: (modulePath: string) => any
    diagnostics: Diagnostics
    delimiter?: string;
}

export class StylableTransformer {
    fileProcessor: FileProcessor<StylableMeta>;
    diagnostics: Diagnostics;
    resolver: StylableResolver;
    delimiter: string;
    constructor(options: Options) {
        this.diagnostics = options.diagnostics;
        this.delimiter = options.delimiter || '--';
        this.resolver = new StylableResolver(options.fileProcessor, options.requireModule);
    }
    transform(meta: StylableMeta): StylableResults {

        const ast = meta.ast;

        const metaExports: Pojo<string> = {};

        const keyframeMapping = this.scopeKeyframes(meta);

        ast.walkAtRules(/media$/, (atRule: SAtRule) => {
            atRule.sourceParams = atRule.params;
            atRule.params = this.replaceValueFunction(atRule.params, meta);
        });

        ast.walkRules((rule: SRule) => {
            this.appendMixins(ast, rule);
        });

        ast.walkRules((rule: SRule) => {
            rule.selector = this.scopeRule(meta, rule, metaExports);
            rule.walkDecls((decl: SDecl) => {
                decl.sourceValue = decl.value;
                decl.value = this.replaceValueFunction(decl.value, meta);
            });
        });

        this.exportRootClass(meta, metaExports);
        this.exportLocalVars(meta, metaExports);
        this.exportKeyframes(keyframeMapping, metaExports);

        //applyMixins() DONE!
        //applyVariants()
        //applyVars() DONE!
        //scopeSelectors() DONE!
        //scopeKeyframes() DONE!
        //handleAtMediaValue() DONE!
        //createExports() DONE!

        return {
            meta,
            exports: metaExports
        }

    }
    exportLocalVars(meta: StylableMeta, metaExports: Pojo<string>) {
        meta.vars.forEach((varSymbol) => {
            if (metaExports[varSymbol.name]) {
                //TODO: warn on discard
            } else {
                let value = this.resolver.resolveVarValue(meta, varSymbol.name);
                metaExports[varSymbol.name] = typeof value === 'string' ? value : varSymbol.value;
            }
        });
    }
    exportKeyframes(keyframeMapping: Pojo<string>, metaExports: Pojo<string>) {
        Object.keys(keyframeMapping).forEach((name) => {
            if (metaExports[name]) {
                //TODO: warn on discard
            } else {
                metaExports[name] = keyframeMapping[name];
            }
        });
    }
    exportRootClass(meta: StylableMeta, metaExports: Pojo<string>) {
        //TODO: move the theme root composition to the process;
        const classExports: Pojo<string> = {};
        this.handleClass(meta, { type: 'class', name: meta.mappedSymbols[meta.root].name, nodes: [] }, meta.mappedSymbols[meta.root].name, classExports);
        let scopedName = classExports[meta.mappedSymbols[meta.root].name];
        meta.imports.forEach(_import => {
            if (_import.theme) {
                const resolved = this.resolver.deepResolve({
                    _kind: "import",
                    type: "default",
                    name: "default",
                    import: _import
                });
                if (resolved && resolved._kind === 'css') {
                    const classExports: Pojo<string> = {};
                    this.exportRootClass(resolved.meta, classExports);
                    scopedName += ' ' + classExports[resolved.symbol.name];
                } else {
                    //TODO: warn
                }
            }
        });
        metaExports[meta.root] = scopedName;
    }
    exportClass(meta: StylableMeta, name: string, classSymbol: ClassSymbol, metaExports: Pojo<string>) {
        const scopedName = this.scope(name, meta.namespace);

        if (!metaExports[name]) {
            const extend = classSymbol ? classSymbol[valueMapping.extends] : undefined;
            const compose = classSymbol ? classSymbol[valueMapping.compose] : undefined;
            let exportedClasses = scopedName;

            if (extend && extend !== classSymbol) {
                let finalSymbol;
                let finalName;
                let finalMeta;
                if (extend._kind === 'class') {
                    finalSymbol = extend;
                    finalName = extend.name;
                    finalMeta = meta;
                } else if (extend._kind === 'import') {
                    const resolved = this.resolver.deepResolve(extend);
                    if (resolved && resolved._kind === 'css' && resolved.symbol) {
                        if (resolved.symbol._kind === 'class') {
                            finalSymbol = resolved.symbol;
                            finalName = resolved.symbol.name;
                            finalMeta = resolved.meta;
                        } else {
                            //TODO: warn
                        }
                    } else {
                        //TODO: warn
                    }
                } else {
                    //TODO: warn
                }

                if (finalSymbol && finalName && finalMeta && !finalSymbol[valueMapping.root]) {
                    const classExports: Pojo<string> = {};
                    this.handleClass(finalMeta, { type: 'class', name: finalName, nodes: [] }, finalName, classExports);
                    if (classExports[finalName]) {
                        exportedClasses += ' ' + classExports[finalName];
                    } else {
                        //TODO: warn
                    }
                }
            }

            if (compose) {
                compose.forEach((symbol) => {
                    let finalName;
                    let finalMeta;
                    if (symbol._kind === 'class') {
                        finalName = symbol.name;
                        finalMeta = meta;
                    } else if (symbol._kind === 'import') {
                        const resolved = this.resolver.deepResolve(symbol);
                        if (resolved && resolved._kind === 'css' && resolved.symbol) {
                            if (resolved.symbol._kind === 'class') {
                                finalName = resolved.symbol.name;
                                finalMeta = resolved.meta;
                            } else {
                                //TODO: warn
                            }
                        } else {
                            //TODO: warn
                        }
                    } else {
                        //TODO: warn
                    }

                    if (finalName && finalMeta) {
                        const classExports: Pojo<string> = {};
                        this.handleClass(finalMeta, { type: 'class', name: finalName, nodes: [] }, finalName, classExports);
                        if (classExports[finalName]) {
                            exportedClasses += ' ' + classExports[finalName];
                        } else {
                            //TODO: warn
                        }
                    }

                })
            }
            metaExports[name] = exportedClasses;
        }

        return scopedName;

    }
    appendMixins(root: postcss.Root, rule: SRule) {
        if (!rule.mixins || rule.mixins.length === 0) {
            return;
        }

        rule.mixins.forEach((mix) => {
            const resolvedMixin = this.resolver.deepResolve(mix.ref);
            if (resolvedMixin) {
                if (resolvedMixin._kind === 'js') {
                    if (typeof resolvedMixin.symbol === 'function') {
                        const res = resolvedMixin.symbol(mix.mixin.options);
                        const mixinRoot = cssObjectToAst(res).root;
                        mergeRules(mixinRoot, rule);
                    }
                } else {
                    const resolvedClass = this.resolver.deepResolve(mix.ref);
                    if (resolvedClass && resolvedClass._kind === 'css') {
                        mergeRules(createClassSubsetRoot(resolvedClass.meta.ast, '.' + resolvedClass.symbol.name), rule);
                    } else {
                        //TODO: add warn
                    }
                }
            } else if (mix.ref._kind === 'class') {
                mergeRules(createClassSubsetRoot(root, '.' + mix.ref.name), rule);
            } else {
                //TODO: report unresolvable
            }
        })
    }
    replaceValueFunction(value: string, meta: StylableMeta) {
        return valueReplacer(value, {}, (_value, name, match) => {
            let value = this.resolver.resolveVarValue(meta, name);
            return typeof value === 'string' ? value : match;
        });
    }
    scopeKeyframes(meta: StylableMeta) {
        //TODO: handle reserved
        // const reserved = [
        //     "none",
        //     "inherited",
        //     "initial",
        //     "unset",
        //     /* single-timing-function */
        //     "linear",
        //     "ease",
        //     "ease-in",
        //     "ease-in-out",
        //     "ease-out",
        //     "step-start",
        //     "step-end",
        //     "start",
        //     "end",
        //     /* single-animation-iteration-count */
        //     "infinite",
        //     /* single-animation-direction */
        //     "normal",
        //     "reverse",
        //     "alternate",
        //     "alternate-reverse",
        //     /* single-animation-fill-mode */
        //     "forwards",
        //     "backwards",
        //     "both",
        //     /* single-animation-play-state */
        //     "running",
        //     "paused"
        // ];

        const root = meta.ast;
        const keyframesExports: Pojo<string> = {};

        root.walkAtRules(/keyframes$/, (atRule) => {
            const name = atRule.params;
            atRule.params = keyframesExports[name] || (keyframesExports[name] = this.scope(name, meta.namespace));
        });

        root.walkDecls(/animation$|animation-name$/, decl => {
            const parsed = valueParser(decl.value);
            parsed.nodes.forEach((node: any) => {
                const alias = keyframesExports[node.value];
                if (node.type === "word" && Boolean(alias)) {
                    node.value = alias;
                }
            });
            decl.value = parsed.toString();
        });

        return keyframesExports;

    }
    scopeRule(meta: StylableMeta, rule: SRule, metaExports: Pojo<string>) {
        let current = meta;
        let symbol: StylableSymbol;
        let nestedSymbol: StylableSymbol | null;
        let originSymbol: ClassSymbol | ElementSymbol;
        let selectorAst = parseSelector(rule.selector) //.selectorAst;
        traverseNode(selectorAst, (node) => {
            const { name, type } = node;
            if (type === 'selector' || type === 'spacing' || type === 'operator') {
                if (nestedSymbol) {
                    symbol = nestedSymbol;
                    nestedSymbol = null;
                } else {
                    current = meta;
                    symbol = meta.classes[meta.root];
                    originSymbol = symbol;
                }
            } else if (type === 'class') {
                const next = this.handleClass(current, node, name, metaExports);
                originSymbol = current.classes[name];
                symbol = next.symbol;
                current = next.meta;
            } else if (type === 'element') {
                const next = this.handleElement(current, node, name);
                originSymbol = current.elements[name];
                symbol = next.symbol;
                current = next.meta;
            } else if (type === 'pseudo-element') {
                const next = this.handlePseudoElement(current, node, name);
                symbol = next.symbol;
                current = next.meta;
            } else if (type === 'pseudo-class') {
                current = this.handlePseudoClass(current, node, name, symbol, meta, originSymbol);
            } else if (type === 'nested-pseudo-class') {
                if (name === 'global') {
                    node.type = 'selector';
                    return true;
                }
                nestedSymbol = symbol;
            }
            /* do nothing */
            return undefined;
        });

        const scopedRoot = this.scope(meta.root, meta.namespace);
        selectorAst.nodes.forEach((selector) => {
            const first = selector.nodes[0];
            if (first && first.type === 'selector' && first.name === 'global') {
                return;
            }
            if (first && first.before && first.before === '.' + scopedRoot) {
                return;
            }

            if (!first || (first.name !== scopedRoot)) {
                selector.nodes = [{
                    type: 'class', name: scopedRoot, nodes: []
                }, {
                    type: 'spacing', value: " ", name: '', nodes: []
                }, ...selector.nodes];
            }
        });

        return stringifySelector(selectorAst);

    }
    handleClass(meta: StylableMeta, node: SelectorAstNode, name: string, metaExports: Pojo<string>): CSSResolve {
        const symbol = meta.classes[name];
        const extend = symbol ? symbol[valueMapping.extends] : undefined;

        if (!extend && symbol && symbol.alias) {
            const next = this.resolver.deepResolve(symbol.alias);
            if (next && next._kind === 'css' && next.symbol._kind === 'class') {

                node.name = this.exportClass(next.meta, next.symbol.name, next.symbol, metaExports);
                // const extended = this.resolver.resolve(next.symbol[valueMapping.extends]);
                // if (extended && extended._kind === 'css') {
                //     return extended;
                // }
                return next;
            } else {
                //TODO: warn or handle
            }
        }

        const scopedName = this.exportClass(meta, name, symbol, metaExports);

        const next = this.resolver.resolve(extend);

        if (next && next._kind === 'css') {
            if (next.symbol._kind === 'class') {
                node.before = '.' + scopedName;
                node.name = this.scope(next.symbol.name, next.meta.namespace);
            } else {
                //TODO: warn
            }
            return next;
        }

        if (extend && extend._kind === 'class') {
            node.before = '.' + scopedName;
            if (extend === symbol && extend.alias) {
                const next = this.resolver.deepResolve(extend.alias);
                if (next && next._kind === 'css') {
                    node.name = this.scope(next.symbol.name, next.meta.namespace);
                    return next;
                }
            } else {
                node.name = this.scope(extend.name, meta.namespace);
            }
        } else {
            node.name = scopedName;
        }
        return { _kind: 'css', meta, symbol };
    }
    handleElement(meta: StylableMeta, node: SelectorAstNode, name: string) {
        const tRule = <StylableSymbol>meta.elements[name];
        const extend = tRule ? meta.mappedSymbols[name] : undefined;
        const next = this.resolver.resolve(extend);
        if (next && next._kind === 'css') {
            node.type = 'class';
            node.name = this.scope(next.symbol.name, next.meta.namespace);
            return next;
        }

        return { meta, symbol: tRule };
    }
    handlePseudoElement(meta: StylableMeta, node: SelectorAstNode, name: string): CSSResolve {
        let next: JSResolve | CSSResolve | null;

        let symbol = meta.mappedSymbols[name];
        let current = meta;
        while (!symbol) {
            let root = <ClassSymbol>current.mappedSymbols[current.root];
            next = this.resolver.resolve(root[valueMapping.extends]);
            if (next && next._kind === "css") {
                current = next.meta;
                symbol = next.meta.mappedSymbols[name]
            } else {
                break;
            }
        }

        if (symbol) {
            if (symbol._kind === 'class') {

                node.type = 'class';
                node.before = symbol[valueMapping.root] ? '' : ' ';
                node.name = this.scope(symbol.name, current.namespace);

                let extend = symbol[valueMapping.extends];
                if (extend && extend._kind === 'class' && extend.alias) {
                    extend = extend.alias;
                }
                next = this.resolver.resolve(extend);

                if (next && next._kind === 'css') {
                    return next;
                }
            }
        }

        return { _kind: 'css', meta: current, symbol };
    }
    handlePseudoClass(meta: StylableMeta, node: SelectorAstNode, name: string, symbol: StylableSymbol, origin: StylableMeta, originSymbol: ClassSymbol | ElementSymbol) {
        let current = meta;
        let currentSymbol = symbol;

        if (symbol !== originSymbol) {
            const states = originSymbol[valueMapping.states];
            if (states && states.hasOwnProperty(name)) {
                if (states[name] === null) {
                    node.type = 'attribute';
                    node.content = this.autoStateAttrName(name, origin.namespace);
                } else {
                    node.type = 'invalid';// simply concat global mapped selector - ToDo: maybe change to 'selector'
                    node.value = states[name];
                }
                return current;
            }
            
        }

        while (current && currentSymbol) {
            if (currentSymbol && currentSymbol._kind === 'class') {
                const states = currentSymbol[valueMapping.states];
                const extend = currentSymbol[valueMapping.extends];

                if (states && states.hasOwnProperty(name)) {
                    if (states[name] === null) {
                        node.type = 'attribute';
                        node.content = this.autoStateAttrName(name, current.namespace);
                    } else {
                        node.type = 'invalid';// simply concat global mapped selector - ToDo: maybe change to 'selector'
                        node.value = states[name];
                    }
                    break;
                } else if (extend) {
                    let next = this.resolver.resolve(extend);
                    if (next && next.meta) {
                        currentSymbol = next.symbol;
                        current = next.meta;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        return current;
    }
    //TODO: Extract to scoping utils
    autoStateAttrName(stateName: string, namespace: string) {
        return `data-${namespace.toLowerCase()}-${stateName.toLowerCase()}`;
    }
    cssStates(stateMapping: Pojo<boolean> | null | undefined, namespace: string) {
        return stateMapping ? Object.keys(stateMapping).reduce((states: Pojo<boolean>, key) => {
            if (stateMapping[key]) { states[this.autoStateAttrName(key, namespace)] = true; }
            return states;
        }, {}) : {};
    }
    scope(name: string, namespace: string, delimiter: string = this.delimiter) {
        return namespace ? namespace + delimiter + name : name;
    }
}


