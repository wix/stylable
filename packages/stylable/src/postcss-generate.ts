import * as postcss from 'postcss';
// import * as path from 'path';
import { Pojo } from "./types";
import { StylableMeta, SRule, ImportSymbol, TypedRule } from './postcss-process';
import { FileProcessor } from "./cached-process-file";
import { traverseNode, stringifySelector, SelectorAstNode } from "./selector-utils";
import { Diagnostics } from "./diagnostics";
import { valueMapping } from "./stylable-value-parsers";

export interface Options {
    fileProcessor: FileProcessor<StylableMeta>
    diagnostics: Diagnostics
}

export class StylableResolver {
    constructor(private fileProcessor: FileProcessor<StylableMeta>) {

    }
    resolve(importSymbol: ImportSymbol) {
        if (!importSymbol) {
            return null;
        }
        const { from } = importSymbol.import;

        const meta = this.fileProcessor.process(from);
        let symbol: TypedRule;

        if (importSymbol.type === 'default') {
            symbol = meta.classes[meta.root];
        } else {
            symbol = meta.classes[importSymbol.export];
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

        root.walkRules((rule: SRule) => {
            console.log(rule);

            rule.selector = this.scopeRule(meta, rule);

        });

        //resolveSymbols()
        //applyVars()
        //applyMixins()
        //applyVariants()
        //scopeSelectors()
        //scopeKeyframes()
        //handleAtMediaValue()

        return root;

    }
    scopeRule(meta: StylableMeta, rule: SRule) {
        let current = meta;
        let classname: string;
        let element: string;

        traverseNode(rule.selectorAst, (node) => {
            const { name, type } = node;
            if (type === 'selector') {
                current = meta;
                classname = meta.root;
            } else if (type === 'class') {
                classname = name;
                current = this.handleClass(current, node, name);
            } else if (type === 'element') {
                // current = this.handleElement(current, node, name);
            } else if (type === 'pseudo-element') {
                element = name;
                // current = this.handlePseudoElement(current, node, name);
            } else if (type === 'pseudo-class') {
                // current = this.handlePseudoClass(current, node, name, meta, classname, element);
            } else if (type === 'nested-pseudo-class') {
                if (name === 'global') {
                    node.type = 'selector';
                    return true;
                }
            }
            /* do nothing */
            return undefined;
        });

        return stringifySelector(rule.selectorAst);
    }
    handleClass(meta: StylableMeta, node: SelectorAstNode, name: string) {
        debugger;
        const tRule = meta.classes[name];
        const extend = tRule ? tRule[valueMapping.extends] : null;
        const next = this.resolver.resolve(extend);

        if (next) {

            node.before = '.' + [
                this.scope(meta.root, meta.namespace),
                this.scope(name, meta.namespace)
            ].join(' .');

            node.before += next.symbol["-st-root"] ? '' : ' ';

            node.name = this.scope(next.symbol.name, next.meta.namespace);
        } else {
            node.before = '.' + this.scope(meta.root, meta.namespace) + ' ';
            node.name = this.scope(name, meta.namespace);
        }
        return meta;
    }
    // handleElement(meta: StylableMeta, node: SelectorAstNode, name: string) {
    //     return meta;
    // }
    // handlePseudoElement(meta: StylableMeta, node: SelectorAstNode, name: string) {
    //     return meta;
    // }
    // handlePseudoClass(current, node, name, meta, classname, element) {
    //     return meta;
    // }
    scope(name: string, namespace: string, separator: string = '--') {
        return namespace ? namespace + separator + name : name;
    }
}
