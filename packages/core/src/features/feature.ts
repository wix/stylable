import type { StylableMeta } from '../stylable-meta';
import type { ScopeContext } from '../stylable-transformer';
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
    SELECTOR: any;
    IMMUTABLE_SELECTOR: any;
}

export interface FeatureHooks<T extends NodeTypes> {
    analyzeInit: (context: FeatureContext) => void;
    analyzeSelectorNode: (options: {
        context: FeatureContext;
        node: T['IMMUTABLE_SELECTOR'];
        rule: postcss.Rule;
        walkContext: SelectorNodeContext;
    }) => void;
    transformInit: (options: { context: FeatureTransformContext }) => void;
    transformSelectorNode: (options: {
        context: FeatureTransformContext;
        node: T['SELECTOR'];
        selectorContext: Required<ScopeContext>;
    }) => void;
}
const defaultHooks: FeatureHooks<NodeTypes> = {
    analyzeInit() {
        /**/
    },
    analyzeSelectorNode() {
        /**/
    },
    transformInit() {
        /**/
    },
    transformSelectorNode() {
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
