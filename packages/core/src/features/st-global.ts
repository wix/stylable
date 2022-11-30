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
    ImmutableSelectorNode,
    SelectorList,
    PseudoClass,
} from '@tokey/css-selector-parser';
import { createDiagnosticReporter } from '../diagnostics';
import type * as postcss from 'postcss';

const dataKey = plugableRecord.key<{
    rules: Map<postcss.Rule, { isGlobal: boolean; isInSource: boolean; selectors: boolean[] }>;
    replacementRules: Map<postcss.AtRule, postcss.Rule>;
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
        plugableRecord.set(meta.data, dataKey, { rules: new Map(), replacementRules: new Map() });
    },
    analyzeSelectorNode({ context, node, topSelectorIndex, rule, originalNode }) {
        const { rules } = plugableRecord.getUnsafe(context.meta.data, dataKey);
        if (node.type === 'selector' || node.type === 'combinator' || node.type === 'comment') {
            return;
        }
        if (!rules.has(rule)) {
            rules.set(rule, {
                isGlobal: true,
                isInSource: rule === originalNode,
                selectors: [],
            });
        }
        const ruleData = rules.get(rule)!;
        if (node.type === 'pseudo_class' && node.value === `global`) {
            // mark selector as global only if it isn't set
            if (ruleData.selectors[topSelectorIndex] === undefined) {
                ruleData.selectors[topSelectorIndex] = true;
            }
            if (node.nodes && node.nodes?.length > 1) {
                context.diagnostics.report(diagnostics.UNSUPPORTED_MULTI_SELECTOR_IN_GLOBAL(), {
                    node: rule,
                    word: stringifySelector(node.nodes),
                });
            }
            return walkSelector.skipNested;
        } else {
            // mark selector as local if it has a local selector
            ruleData.selectors[topSelectorIndex] = false;
        }
        return;
    },
    analyzeSelectorDone({ context, rule }) {
        const { rules, replacementRules } = plugableRecord.getUnsafe(context.meta.data, dataKey);
        const data = rules.get(rule);
        if (!data) {
            return;
        }

        let foundLocalParent = false;
        let parent: postcss.Container | postcss.Document | undefined = rule.parent;
        while (parent) {
            const actualRule = replacementRules.get(parent as postcss.AtRule) || parent;
            if (actualRule.type === 'rule') {
                if (rules.get(actualRule as postcss.Rule)?.isGlobal === false) {
                    foundLocalParent = true;
                    break;
                }
            }
            parent = parent.parent;
        }
        // rule is global is it doesn't has a local parent parent and at least one global selector
        data.isGlobal = foundLocalParent ? false : !!data.selectors.find((isGlobal) => isGlobal);
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

export function registerReplacementRule(
    meta: StylableMeta,
    atRule: postcss.AtRule,
    rule: postcss.Rule
) {
    const { replacementRules } = plugableRecord.getUnsafe(meta.data, dataKey);
    replacementRules.set(atRule, rule);
}

export function getGlobalRules(meta: StylableMeta) {
    const { rules } = plugableRecord.getUnsafe(meta.data, dataKey);
    const globalRules: postcss.Rule[] = [];
    for (const [rule, { isGlobal, isInSource }] of rules) {
        if (isGlobal && isInSource) {
            globalRules.push(rule);
        }
    }
    return globalRules;
}

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
