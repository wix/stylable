import { createFeature } from './feature';
import { plugableRecord } from '../helpers/plugable-record';
import {
    walkSelector,
    stringifySelector,
    parseSelectorWithCache,
    flattenFunctionalSelector,
} from '../helpers/selector';
import type { StylableMeta } from '../stylable-meta';
import type {
    SelectorNode,
    ImmutablePseudoClass,
    SelectorList,
    PseudoClass,
} from '@tokey/css-selector-parser';
import { createDiagnosticReporter } from '../diagnostics';

const dataKey = plugableRecord.key<Record<string, true>>('globals');

export const diagnostics = {
    UNSUPPORTED_MULTI_SELECTOR_IN_GLOBAL: createDiagnosticReporter(
        '04001',
        'error',
        () => `unsupported multi selector in :global()`
    ),
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
            context.diagnostics.report(diagnostics.UNSUPPORTED_MULTI_SELECTOR_IN_GLOBAL(), {
                node: rule,
                word: stringifySelector(node.nodes),
            });
        }
        return walkSelector.skipNested;
    },
    transformInit({ context }) {
        context.meta.globals = {};
    },
    transformLastPass({ context: { meta }, ast }) {
        ast.walkRules((r) => {
            if (!r.selector.includes(`:global(`)) {
                return;
            }
            const selectorAst = parseSelectorWithCache(r.selector, { clone: true });
            const globals = unwrapPseudoGlobals(selectorAst);
            addGlobals(meta, globals);
            r.selector = stringifySelector(selectorAst);
        });
    },
});

// API

export function unwrapPseudoGlobals(selectorAst: SelectorList) {
    const collectedGlobals: PseudoClass[] = [];
    walkSelector(selectorAst, (node) => {
        if (node.type === 'pseudo_class' && node.value === 'global') {
            collectedGlobals.push(node);
            if (node.nodes?.length === 1) {
                flattenFunctionalSelector(node);
            }
            return walkSelector.skipNested;
        }
        return;
    });
    return collectedGlobals;
}

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
