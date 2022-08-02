import type { StylableMeta } from '../stylable-meta';
import type { ScopeContext, StylableExports, StylableTransformer } from '../stylable-transformer';
import type { StylableResolver, MetaResolvedSymbols } from '../stylable-resolver';
import type { StylableEvaluator, EvalValueData } from '../functions';
import type * as postcss from 'postcss';
import type { ImmutableSelectorNode } from '@tokey/css-selector-parser';
import type { Diagnostics } from '../diagnostics';
import type { ParsedValue } from '../types';

export type SelectorNodeContext = [
    index: number,
    nodes: ImmutableSelectorNode[],
    parents: ImmutableSelectorNode[]
];

export interface FeatureContext {
    meta: StylableMeta;
    diagnostics: Diagnostics;
}
export interface FeatureTransformContext extends FeatureContext {
    resolver: StylableResolver;
    evaluator: StylableEvaluator;
    getResolvedSymbols: (meta: StylableMeta) => MetaResolvedSymbols;
}

export interface NodeTypes {
    SELECTOR?: any;
    IMMUTABLE_SELECTOR?: any;
    RESOLVED?: any;
}

type SelectorWalkReturn = number | undefined | void;

export interface FeatureHooks<T extends NodeTypes = NodeTypes> {
    metaInit: (context: FeatureContext) => void;
    analyzeInit: (context: FeatureContext) => void;
    analyzeAtRule: (options: {
        context: FeatureContext;
        atRule: postcss.AtRule;
        analyzeRule: (rule: postcss.Rule, options: { isScoped: boolean }) => boolean;
    }) => void;
    analyzeSelectorNode: (options: {
        context: FeatureContext;
        node: T['IMMUTABLE_SELECTOR'];
        rule: postcss.Rule;
        walkContext: SelectorNodeContext;
    }) => SelectorWalkReturn;
    analyzeDeclaration: (options: { context: FeatureContext; decl: postcss.Declaration }) => void;
    prepareAST: (options: {
        meta: StylableMeta;
        node: postcss.ChildNode;
        toRemove: Array<postcss.Node | (() => void)>;
    }) => void;
    transformInit: (options: { context: FeatureTransformContext }) => void;
    transformResolve: (options: { context: FeatureTransformContext }) => T['RESOLVED'];
    transformAtRuleNode: (options: {
        context: FeatureTransformContext;
        atRule: postcss.AtRule;
        resolved: T['RESOLVED'];
    }) => void;
    transformSelectorNode: (options: {
        context: FeatureTransformContext;
        node: T['SELECTOR'];
        selectorContext: Required<ScopeContext>;
    }) => void;
    transformDeclaration: (options: {
        context: FeatureTransformContext;
        decl: postcss.Declaration;
        resolved: T['RESOLVED'];
    }) => void;
    transformValue: (options: {
        context: FeatureTransformContext;
        node: ParsedValue;
        data: EvalValueData;
    }) => void;
    transformJSExports: (options: { exports: StylableExports; resolved: T['RESOLVED'] }) => void;
    transformLastPass: (options: {
        context: FeatureTransformContext;
        ast: postcss.Root;
        transformer: StylableTransformer;
        cssVarsMapping: Record<string, string>;
        path: string[];
    }) => void;
}
const defaultHooks: FeatureHooks<NodeTypes> = {
    metaInit() {
        /**/
    },
    analyzeInit() {
        /**/
    },
    analyzeAtRule() {
        /**/
    },
    analyzeSelectorNode() {
        /**/
    },
    analyzeDeclaration() {
        /**/
    },
    prepareAST() {
        /**/
    },
    transformInit() {
        /**/
    },
    transformResolve() {
        return {};
    },
    transformAtRuleNode() {
        /**/
    },
    transformSelectorNode() {
        /**/
    },
    transformDeclaration() {
        /**/
    },
    transformValue() {
        /**/
    },
    transformJSExports() {
        /**/
    },
    transformLastPass() {
        /**/
    },
};
export function createFeature<T extends NodeTypes>(
    hooks: Partial<FeatureHooks<T>>
): FeatureHooks<T> {
    return {
        ...defaultHooks,
        ...hooks,
    };
}
