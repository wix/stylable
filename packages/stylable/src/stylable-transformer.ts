import * as postcss from 'postcss';
import { StylableMeta, SRule, ClassSymbol, StylableSymbol } from './postcss-process';
import { FileProcessor } from "./cached-process-file";
import { traverseNode, stringifySelector, SelectorAstNode } from "./selector-utils";
import { Diagnostics } from "./diagnostics";
import { valueMapping } from "./stylable-value-parsers";
import { Pojo } from "./types";
import { valueReplacer } from "./value-template";
import { stripQuotation } from "./utils";
import { StylableResolver, CSSResolve, JSResolve } from "./postcss-resolver";
import { cssObjectToAst } from "./parser";
import { createClassSubsetRoot, mergeRules } from "./postcss-utils";


const valueParser = require("postcss-value-parser");


export interface Options {
    fileProcessor: FileProcessor<StylableMeta>
    requireModule: (modulePath: string) => any
    diagnostics: Diagnostics
}

export class StylableTransformer {
    fileProcessor: FileProcessor<StylableMeta>;
    diagnostics: Diagnostics;
    resolver: StylableResolver;
    constructor(options: Options) {
        this.diagnostics = options.diagnostics;
        this.resolver = new StylableResolver(options.fileProcessor, options.requireModule);
    }
    transform(meta: StylableMeta) {

        const root = meta.ast;
        const metaExports: Pojo<string> = {};
        this.scopeKeyframes(meta);

        root.walkAtRules(/media$/, (atRule) => {
            atRule.params = this.replaceValueFunction(atRule.params, meta);
        });

        root.walkRules((rule: SRule) => {
            this.appendMixins(root, rule);
        });

        root.walkRules((rule: SRule) => {
            rule.selector = this.scopeRule(meta, rule, metaExports);
            rule.walkDecls((decl) => {
                decl.value = this.replaceValueFunction(decl.value, meta);
            });
        });

        //applyMixins()
        //applyVariants()
        //applyVars() DONE!
        //scopeSelectors() DONE!
        //scopeKeyframes() DONE!
        //handleAtMediaValue() DONE!
        //createExports()

        return {
            meta,
            exports: metaExports
        }

    }
    appendMixins(root: postcss.Root, rule: SRule) {
        if (!rule.mixins || rule.mixins.length === 0) {
            return;
        }

        rule.mixins.forEach((mix) => {
            const resolvedMixin = this.resolver.resolve(mix.ref);
            if (resolvedMixin) {
                if (resolvedMixin._kind === 'js') {
                    if (typeof resolvedMixin.symbol === 'function') {
                        const res = resolvedMixin.symbol(mix.mixin.options);
                        const mixinRoot = cssObjectToAst(res).root;
                        mergeRules(mixinRoot, rule);
                    }
                } else {
                    //TODO: implement imported class mixin
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

            let symbol = meta.mappedSymbols[name];

            while (symbol) {
                let next;
                if (symbol._kind === 'var' && symbol.import) {
                    next = this.resolver.resolve(symbol.import);
                } else if (symbol._kind === 'import') {
                    next = this.resolver.resolve(symbol);
                } else {
                    break;
                }

                if (next) {
                    symbol = next.symbol;
                } else {
                    break;
                }
            }
            if (symbol && symbol._kind === 'var') {
                return stripQuotation(symbol.value);
            } else if (typeof symbol === 'string' /* only from js */) {
                return symbol;
            } else {
                return match;
            }
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

        traverseNode(rule.selectorAst, (node) => {
            const { name, type } = node;
            if (type === 'selector' || type === 'spacing' || type === 'operator') {
                current = meta;
                symbol = meta.classes[meta.root];
            } else if (type === 'class') {
                const next = this.handleClass(current, node, name, metaExports);
                symbol = next.symbol;
                current = next.meta;
            } else if (type === 'element') {
                current = this.handleElement(current, node, name);
            } else if (type === 'pseudo-element') {
                const next = this.handlePseudoElement(current, node, name);
                symbol = next.symbol;
                current = next.meta;
            } else if (type === 'pseudo-class') {
                current = this.handlePseudoClass(current, node, name, symbol);
            } else if (type === 'nested-pseudo-class') {
                if (name === 'global') {
                    node.type = 'selector';
                    return true;
                }
            }
            /* do nothing */
            return undefined;
        });

        const scopedRoot = metaExports[meta.root] || (metaExports[meta.root] = this.scope(meta.root, meta.namespace));
        rule.selectorAst.nodes.forEach((selector) => {
            const first = selector.nodes[0];

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

        return stringifySelector(rule.selectorAst);

    }
    handleClass(meta: StylableMeta, node: SelectorAstNode, name: string, metaExports: Pojo<string>): CSSResolve {
        const symbol = meta.classes[name];
        const extend = symbol ? symbol[valueMapping.extends] : undefined;

        if (!extend && symbol && symbol.alias) {
            const next = this.resolver.resolve(symbol.alias);
            if (next && next._kind === 'css') {
                node.name = this.scope(next.symbol.name, next.meta.namespace);
                return next;
            } else {
                //TODO: warn or handle
            }
        }

        const next = this.resolver.resolve(extend);
        //TODO: handle compose here!
        const scopedName = metaExports[name] || (metaExports[name] = this.scope(name, meta.namespace));

        if (next && next._kind === 'css') {
            if (next.symbol._kind === 'class') {
                node.before = '.' + scopedName;
                // node.before += next.symbol[valueMapping.root] ? '' : ' ';
                node.name = this.scope(next.symbol.name, next.meta.namespace);
            } else {
                //TODO: warn
            }
            return next;
        }

        if (extend && extend._kind === 'class') {
            node.before = '.' + scopedName;
            // node.before += extend[valueMapping.root] ? '' : ' ';
            node.name = this.scope(extend.name, meta.namespace);
        } else {
            node.name = scopedName;
        }
        return { _kind: 'css', meta, symbol };
    }
    handleElement(meta: StylableMeta, node: SelectorAstNode, name: string) {
        const tRule = meta.elements[name];
        const extend = tRule ? meta.mappedSymbols[name] : undefined;
        const next = this.resolver.resolve(extend);
        if (next && next.meta) {
            node.type = 'class';
            node.name = this.scope(next.symbol.name, next.meta.namespace);
            return next.meta;
        }

        return meta;
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

                next = this.resolver.resolve(symbol[valueMapping.extends]);

                if (next && next._kind === 'css') {
                    return next;
                }
            }
        }

        return { _kind: 'css', meta: current, symbol };
    }
    handlePseudoClass(meta: StylableMeta, node: SelectorAstNode, name: string, symbol: StylableSymbol) {
        let current = meta;
        let currentSymbol = symbol;

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
    scope(name: string, namespace: string, separator: string = '--') {
        return namespace ? namespace + separator + name : name;
    }
}


