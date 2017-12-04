import * as postcss from 'postcss';
import { FileProcessor } from './cached-process-file';
import { Diagnostics } from './diagnostics';
import { CSSResolve, StylableResolver } from './postcss-resolver';
import { SelectorAstNode } from './selector-utils';
import { ClassSymbol, ElementSymbol, SRule, StylableMeta, StylableSymbol } from './stylable-processor';
import { Pojo } from './types';
export interface ResolvedElement {
    name: string;
    type: string;
    resolved: CSSResolve[];
}
export interface KeyFrameWithNode {
    value: string;
    node: postcss.Node;
}
export interface StylableResults {
    meta: StylableMeta;
    exports: Pojo<string>;
}
export interface ScopedSelectorResults {
    current: StylableMeta;
    symbol: StylableSymbol | null;
    selectorAst: SelectorAstNode;
    selector: string;
    elements: ResolvedElement[][];
}
export interface Options {
    fileProcessor: FileProcessor<StylableMeta>;
    requireModule: (modulePath: string) => any;
    diagnostics: Diagnostics;
    delimiter?: string;
    keepValues?: boolean;
    optimize?: boolean;
}
export interface AdditionalSelector {
    selectorNode: SelectorAstNode;
    node: SelectorAstNode;
    customElementChunk: string;
}
export declare class StylableTransformer {
    fileProcessor: FileProcessor<StylableMeta>;
    diagnostics: Diagnostics;
    resolver: StylableResolver;
    delimiter: string;
    keepValues: boolean;
    optimize: boolean;
    constructor(options: Options);
    transform(meta: StylableMeta): StylableResults;
    isChildOfAtRule(rule: postcss.Rule, atRuleName: string): boolean;
    exportLocalVars(meta: StylableMeta, metaExports: Pojo<string>): void;
    exportKeyframes(keyframeMapping: Pojo<KeyFrameWithNode>, metaExports: Pojo<string>): void;
    exportRootClass(meta: StylableMeta, metaExports: Pojo<string>): void;
    exportClass(meta: StylableMeta, name: string, classSymbol: ClassSymbol, metaExports: Pojo<string>): string;
    appendMixins(root: postcss.Root, rule: SRule): void;
    replaceValueFunction(node: postcss.Node, value: string, meta: StylableMeta): string;
    scopeKeyframes(meta: StylableMeta): Pojo<KeyFrameWithNode>;
    resolveSelectorElements(meta: StylableMeta, selector: string): ResolvedElement[][];
    scopeSelector(meta: StylableMeta, selector: string, metaExports: Pojo<string>, scopeRoot?: boolean, calcPaths?: boolean, rule?: postcss.Rule): ScopedSelectorResults;
    addAdditionalSelectors(addedSelectors: AdditionalSelector[], selectorAst: SelectorAstNode): void;
    applyRootScoping(meta: StylableMeta, selectorAst: SelectorAstNode): void;
    scopeRule(meta: StylableMeta, rule: postcss.Rule, metaExports: Pojo<string>): string;
    handleClass(meta: StylableMeta, node: SelectorAstNode, name: string, metaExports: Pojo<string>): CSSResolve;
    handleElement(meta: StylableMeta, node: SelectorAstNode, name: string): {
        meta: StylableMeta;
        symbol: StylableSymbol;
    };
    handlePseudoElement(meta: StylableMeta, node: SelectorAstNode, name: string, selectorNode: SelectorAstNode, addedSelectors: AdditionalSelector[], rule?: postcss.Rule): CSSResolve;
    handlePseudoClass(meta: StylableMeta, node: SelectorAstNode, name: string, symbol: StylableSymbol | null, origin: StylableMeta, originSymbol: ClassSymbol | ElementSymbol, rule?: postcss.Rule): StylableMeta;
    autoStateAttrName(stateName: string, namespace: string): string;
    cssStates(stateMapping: Pojo<boolean> | null | undefined, namespace: string): {};
    scope(name: string, namespace: string, delimiter?: string): string;
}
