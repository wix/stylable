import type { StylableMeta } from '../stylable-meta';
import type { ScopeContext } from '../stylable-transformer';
import type * as postcss from 'postcss';
import type { ImmutableSelectorNode } from '@tokey/css-selector-parser';

export type SelectorNodeContext = [
    index: number,
    nodes: ImmutableSelectorNode[],
    parents: ImmutableSelectorNode[]
];

export interface AnalyzeContext {
    meta: StylableMeta;
}
export interface TransformContext {
    meta: StylableMeta;
}

export interface NodeTypes {
    SELECTOR: any;
    IMMUTABLE_SELECTOR: any;
}

export interface FeatureHooks<T extends NodeTypes> {
    analyzeInit: (meta: StylableMeta) => void;
    analyzeSelectorNode: (
        options: AnalyzeContext & {
            node: T['IMMUTABLE_SELECTOR'];
            rule: postcss.Rule;
            walkContext: SelectorNodeContext;
        }
    ) => void;
    transformSelectorNode: (
        options: TransformContext & {
            node: T['SELECTOR'];
            selectorContext: Required<ScopeContext>;
        }
    ) => void;
}
const defaultHooks: FeatureHooks<NodeTypes> = {
    analyzeInit() {
        /**/
    },
    analyzeSelectorNode() {
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
