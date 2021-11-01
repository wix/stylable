import type { StylableMeta } from '../stylable-meta';
import type * as postcss from 'postcss';

export interface FeatureHooks {
    analyzeInit: (meta: StylableMeta) => void;
    analyzeSelectorNode: (meta: StylableMeta, node: any, rule: postcss.Rule) => void;
}
export function createFeature<HOOKS extends Partial<FeatureHooks>>(hooks: HOOKS) {
    return hooks;
}
