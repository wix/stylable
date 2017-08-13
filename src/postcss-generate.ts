// import * as postcss from 'postcss';
// import * as path from 'path';
import { StylableMeta, SRule, ImportSymbol, ClassSymbol, StylableSymbol } from './postcss-process';
import { FileProcessor } from "./cached-process-file";
import { traverseNode, stringifySelector, SelectorAstNode } from "./selector-utils";
import { Diagnostics } from "./diagnostics";
import { valueMapping } from "./stylable-value-parsers";
import { Pojo } from "./types";
import { valueReplacer } from "./value-template";

const valueParser = require("postcss-value-parser");


export interface Options {
    fileProcessor: FileProcessor<StylableMeta>
    diagnostics: Diagnostics
}

export class StylableResolver {
    constructor(private fileProcessor: FileProcessor<StylableMeta>) {

    }
    resolve(maybeImport: StylableSymbol | undefined) {
        if (!maybeImport || maybeImport._kind !== 'import') {
            return null;
        }
        const importSymbol: ImportSymbol = maybeImport;

        const { from } = importSymbol.import;

        const meta = this.fileProcessor.process(from);
        let symbol: StylableSymbol;

        if (importSymbol.type === 'default') {
            symbol = meta.mappedSymbols[meta.root];
        } else {
            symbol = meta.mappedSymbols[importSymbol.name];
        }

        return { symbol, meta };
    }
}

export class StylableTransformer {
    fileProcessor: FileProcessor<StylableMeta>;
    diagnostics: Diagnostics;
    resolver: StylableResolver;
    constructor(options: Options) {
        this.diagnostics = options.diagnostics;
        this.resolver = new StylableResolver(options.fileProcessor);
    }
    transform(meta: StylableMeta) {

        const root = meta.ast;
        const metaExports: Pojo<string> = {};
        this.scopeKeyframes(meta);

        root.walkRules((rule: SRule) => {
            if (rule.mixins) {
                /*TODO: handle*/
            }
            rule.selector = this.scopeRule(meta, rule, metaExports);

            rule.walkDecls((decl) => {
                decl.value = valueReplacer(decl.value, {}, (value, name, match) => {
                    value;
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

                    return symbol && symbol._kind === 'var' ? symbol.value : match; 
                });
            });

        });

        //applyVars()
        //applyMixins()
        //applyVariants()
        //scopeSelectors() DONE!
        //scopeKeyframes() DONE!
        //handleAtMediaValue()
        //createExports()

        return meta;

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
            //TODO: maybe there is no way for this error to exist
            if (selector.type !== 'selector') { throw new Error('!') }
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
    handleClass(meta: StylableMeta, node: SelectorAstNode, name: string, metaExports: Pojo<string>) {
        const symbol = meta.classes[name];
        const extend = symbol ? symbol[valueMapping.extends] : undefined;
        const next = this.resolver.resolve(extend);
        const scopedName = metaExports[name] || (metaExports[name] = this.scope(name, meta.namespace));
        if (next) {
            if (next.symbol._kind === 'class') {
                node.before = '.' + scopedName;
                node.before += next.symbol[valueMapping.root] ? '' : ' ';
                node.name = this.scope(next.symbol.name, next.meta.namespace);
            } else {
                throw "TODO: warn";
            }
            return next;
        }

        if (extend && extend._kind === 'class') {
            node.before = '.' + scopedName;
            node.before += extend[valueMapping.root] ? '' : ' ';
            node.name = this.scope(extend.name, meta.namespace);
        } else {
            node.name = scopedName;
        }
        return { meta, symbol };
    }
    handleElement(meta: StylableMeta, node: SelectorAstNode, name: string) {
        const tRule = meta.elements[name];
        const extend = tRule ? meta.mappedSymbols[name] : undefined;
        const next = this.resolver.resolve(extend);
        if (next) {
            node.type = 'class';
            node.name = this.scope(next.symbol.name, next.meta.namespace);
            return next.meta;
        }

        return meta;
    }
    handlePseudoElement(meta: StylableMeta, node: SelectorAstNode, name: string) {
        let next;

        let symbol = meta.mappedSymbols[name];
        let current = meta;
        while (!symbol) {
            let root = <ClassSymbol>current.mappedSymbols[current.root];
            next = this.resolver.resolve(root[valueMapping.extends]);
            if (next) {
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

                if (next) {
                    return next;
                }
            }
        }

        return { meta: current, symbol };
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
                    if (next) {
                        currentSymbol = next.symbol;
                        current = next.meta;
                    } else {
                        break;
                    }
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


