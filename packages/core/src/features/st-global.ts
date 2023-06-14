import { createFeature } from './feature';
import { plugableRecord } from '../helpers/plugable-record';
import {
    walkSelector,
    stringifySelector,
    parseSelectorWithCache,
    flattenFunctionalSelector,
    isCompRoot,
} from '../helpers/selector';
import type { StylableMeta } from '../stylable-meta';
import type { ImmutableSelectorNode, SelectorList } from '@tokey/css-selector-parser';
import { createDiagnosticReporter } from '../diagnostics';
import type * as postcss from 'postcss';

const dataKey = plugableRecord.key<{
    rules: Map<
        postcss.Rule | postcss.AtRule,
        {
            isGlobal: boolean;
            checkedRule: postcss.AtRule | postcss.Rule;
            topLevelSelectorsFlags: boolean[];
        }
    >;
}>('globals');

export const diagnostics = {
    UNSUPPORTED_MULTI_SELECTOR_IN_GLOBAL: createDiagnosticReporter(
        '04001',
        'error',
        () => `unsupported multi selector in :global()`
    ),
};

// HOOKS

export const hooks = createFeature<{ IMMUTABLE_SELECTOR: ImmutableSelectorNode }>({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, { rules: new Map() });
    },
    analyzeSelectorNode({ context, node, topSelectorIndex, rule, originalNode }) {
        const { rules } = plugableRecord.getUnsafe(context.meta.data, dataKey);
        if (node.type === 'selector' || node.type === 'combinator' || node.type === 'comment') {
            return;
        }
        if (!rules.has(originalNode)) {
            rules.set(originalNode, {
                isGlobal: true,
                checkedRule: rule,
                topLevelSelectorsFlags: [],
            });
        }
        const ruleData = rules.get(originalNode)!;
        if (node.type === 'pseudo_class' && node.value === `global`) {
            // mark selector as global only if it isn't set
            ruleData.topLevelSelectorsFlags[topSelectorIndex] ??= true;
            if (node.nodes && node.nodes?.length > 1) {
                context.diagnostics.report(diagnostics.UNSUPPORTED_MULTI_SELECTOR_IN_GLOBAL(), {
                    node: rule,
                    word: stringifySelector(node.nodes),
                });
            }
            return walkSelector.skipNested;
        } else if (node.type === 'universal' || (node.type === 'type' && !isCompRoot(node.value))) {
            // mark selector as global only if it isn't set
            ruleData.topLevelSelectorsFlags[topSelectorIndex] ??= true;
        } else {
            // mark selector as local if it has a local selector
            ruleData.topLevelSelectorsFlags[topSelectorIndex] = false;
        }
        return;
    },
    analyzeSelectorDone({ context, originalNode }) {
        const { rules } = plugableRecord.getUnsafe(context.meta.data, dataKey);
        const data = rules.get(originalNode);
        if (!data) {
            return;
        }
        // require at least one global selector in rule selectors
        if (!data.topLevelSelectorsFlags.find((isGlobal) => isGlobal)) {
            data.isGlobal = false;
            return;
        }

        // rule is global if it doesn't have any local parents
        let parent: postcss.Container | postcss.Document | undefined = originalNode.parent;
        while (parent) {
            const parentData = rules.get(parent as postcss.Rule);
            if (parentData) {
                // quick resolution: parent calculated first
                data.isGlobal = parentData.isGlobal;
                break;
            }
            // keep searching
            parent = parent.parent;
        }
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
            walkSelector(unwrapPseudoGlobals(selectorAst), (inner) => {
                if (inner.type === 'class') {
                    meta.globals[inner.value] = true;
                }
            });
            r.selector = stringifySelector(selectorAst);
        });
    },
});

// API

export function getGlobalRules(meta: StylableMeta) {
    const { rules } = plugableRecord.getUnsafe(meta.data, dataKey);
    const globalRules: postcss.Rule[] = [];
    for (const [rule, { isGlobal, checkedRule }] of rules) {
        if (isGlobal && checkedRule === rule && rule.type === 'rule') {
            globalRules.push(rule);
        }
    }
    return globalRules;
}

export function unwrapPseudoGlobals(selectorAst: SelectorList) {
    const collectedGlobals: SelectorList = [];
    walkSelector(selectorAst, (node) => {
        if (node.type === 'pseudo_class' && node.value === 'global') {
            if (node.nodes?.length === 1) {
                collectedGlobals.push(flattenFunctionalSelector(node));
            }
            return walkSelector.skipNested;
        }
        return;
    });
    return collectedGlobals;
}
