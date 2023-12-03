import type { StylableMeta } from '../stylable-meta';
import type {
    InferredSelector,
    ScopeContext,
    StylableExports,
    StylableTransformer,
} from '../stylable-transformer';
import type { StylableResolver, MetaResolvedSymbols } from '../stylable-resolver';
import type { StylableEvaluator, EvalValueData } from '../functions';
import type * as postcss from 'postcss';
import type { ImmutableSelectorNode } from '@tokey/css-selector-parser';
import type { Diagnostics } from '../diagnostics';
import type { ParsedValue } from '../types';

export interface FeatureFlags {
    strictCustomProperty: boolean;
}
export const defaultFeatureFlags: FeatureFlags = {
    strictCustomProperty: false,
};

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
    passedThrough?: string[];
    inferredSelectorMixin?: InferredSelector;
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
        analyzeRule: (
            rule: postcss.Rule,
            options: { isScoped: boolean; originalNode: postcss.AtRule | postcss.Rule }
        ) => boolean;
    }) => void;
    analyzeSelectorNode: (options: {
        context: FeatureContext;
        node: T['IMMUTABLE_SELECTOR'];
        topSelectorIndex: number;
        rule: postcss.Rule;
        originalNode: postcss.AtRule | postcss.Rule; // used by rules generated from at-rules
        walkContext: SelectorNodeContext;
    }) => SelectorWalkReturn;
    analyzeSelectorDone: (options: {
        context: FeatureContext;
        rule: postcss.Rule;
        originalNode: postcss.AtRule | postcss.Rule; // used by rules generated from at-rules
    }) => SelectorWalkReturn;
    analyzeDeclaration: (options: { context: FeatureContext; decl: postcss.Declaration }) => void;
    analyzeDone: (context: FeatureContext) => void;
    prepareAST: (options: {
        context: FeatureTransformContext;
        node: postcss.ChildNode;
        toRemove: Array<postcss.Node | (() => void)>;
    }) => void;
    transformInit: (options: { context: FeatureTransformContext }) => void;
    transformResolve: (options: { context: FeatureTransformContext }) => T['RESOLVED'];
    transformAtRuleNode: (options: {
        context: FeatureTransformContext;
        atRule: postcss.AtRule;
        resolved: T['RESOLVED'];
        // ToDo: move to FeatureTransformContext
        transformer: StylableTransformer;
    }) => void;
    transformSelectorNode: (options: {
        context: FeatureTransformContext;
        node: T['SELECTOR'];
        selectorContext: Required<ScopeContext>;
    }) => boolean | void;
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
    analyzeSelectorDone() {
        /**/
    },
    analyzeDeclaration() {
        /**/
    },
    analyzeDone() {
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
