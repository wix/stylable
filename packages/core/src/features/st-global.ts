import { createFeature } from './feature';
import { plugableRecord } from '../helpers/plugable-record';
import {
    walkSelector,
    stringifySelector,
    parseSelectorWithCache,
    flattenFunctionalSelector,
} from '../helpers/selector';
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
    transformInit({ context }) {
        context.meta.globals = {};
    },
    transformCleanup({ context: { meta } }) {
        meta.outputAst!.walkRules((r) => {
            const selectorAst = parseSelectorWithCache(r.selector, { clone: true });
            walkSelector(selectorAst, (node) => {
                if (node.type === 'pseudo_class' && node.value === 'global') {
                    addGlobals(meta, [node]);
                    flattenFunctionalSelector(node);
                    return walkSelector.skipNested;
                }
                return;
            });
            r.selector = stringifySelector(selectorAst);
        });
    },
});

// API

export function addGlobals(meta: StylableMeta, selectorAst: SelectorNode[]) {
    for (const ast of selectorAst) {
        walkSelector(ast, (inner) => {
            if (inner.type === 'class') {
                // ToDo: consider if to move to css-class feature.
                meta.globals[inner.value] = true;
            }
        });
    }
}
