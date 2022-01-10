import type { StylableMeta } from '../stylable-meta';
import type { ScopeContext, StylableExports } from '../stylable-transformer';
import type { StylableResolver } from '../stylable-resolver';
import type * as postcss from 'postcss';
import type { ImmutableSelectorNode } from '@tokey/css-selector-parser';
import type { Diagnostics } from '../diagnostics';

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
}

export interface NodeTypes {
    SELECTOR?: any;
    IMMUTABLE_SELECTOR?: any;
    RESOLVED?: any;
}

export interface FeatureHooks<T extends NodeTypes = NodeTypes> {
    metaInit: (context: FeatureContext) => void;
    analyzeInit: (context: FeatureContext) => void;
    analyzeAtRule: (options: { context: FeatureContext; atRule: postcss.AtRule }) => void;
    analyzeSelectorNode: (options: {
        context: FeatureContext;
        node: T['IMMUTABLE_SELECTOR'];
        rule: postcss.Rule;
        walkContext: SelectorNodeContext;
    }) => void;
    analyzeDeclaration: (options: { context: FeatureContext; decl: postcss.Declaration }) => void;
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
    transformJSExports: (options: { exports: StylableExports; resolved: T['RESOLVED'] }) => void;
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
    transformJSExports() {
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
