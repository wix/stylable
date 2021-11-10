import type { StylableMeta } from '../stylable-meta';
import type { ScopeContext } from '../stylable-transformer';
import type * as postcss from 'postcss';
import type { ImmutableSelectorNode } from '@tokey/css-selector-parser';

export type SelectorNodeContext = [
    index: number,
    nodes: ImmutableSelectorNode[],
    parents: ImmutableSelectorNode[],
];

export interface FeatureHooks {
    analyzeInit: (meta: StylableMeta) => void;
    analyzeSelectorNode: (meta: StylableMeta, node: any, rule: postcss.Rule, context: SelectorNodeContext) => void;
    transformSelectorNode: (transformContext: Required<ScopeContext>, node: any, resolved: any) => void
}
export function createFeature<HOOKS extends Partial<FeatureHooks>>(hooks: HOOKS) {
    return hooks;
}
