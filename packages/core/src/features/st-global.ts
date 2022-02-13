import { createFeature } from './feature';
import { plugableRecord } from '../helpers/plugable-record';
import { walkSelector, stringifySelector } from '../helpers/selector';
import type { StylableMeta } from '../stylable-meta';
import type { SelectorNode, ImmutablePseudoClass } from '@tokey/css-selector-parser';

const dataKey = plugableRecord.key<Record<string, true>>('globals');

export const diagnostics = {
    UNSUPPORTED_MULTI_SELECTOR_IN_GLOBAL() {
        return `unsupported multi selector in :global()`;
    },
};

// HOOKS

export const hooks = createFeature<{ IMMUTABLE_SELECTOR: ImmutablePseudoClass }>({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, {});
    },
    analyzeSelectorNode({ context, node, rule }) {
        if (node.value !== `global`) {
            return;
        }
        if (node.nodes && node.nodes?.length > 1) {
            context.diagnostics.info(rule, diagnostics.UNSUPPORTED_MULTI_SELECTOR_IN_GLOBAL(), {
                word: stringifySelector(node.nodes),
            });
        }
        return walkSelector.skipNested;
    },
});

// API

export function addGlobals(meta: StylableMeta, selectorAst: SelectorNode[]) {
    for (const ast of selectorAst) {
        walkSelector(ast, (inner) => {
            if (inner.type === 'class') {
                // ToDo: move to css-class feature
                meta.globals[inner.value] = true;
            }
        });
    }
}
