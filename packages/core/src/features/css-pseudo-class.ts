import { createFeature } from './feature';
import { nativePseudoClasses } from '../native-reserved-lists';
import * as STCustomState from './st-custom-state';
import * as CSSType from './css-type';
import { createDiagnosticReporter } from '../diagnostics';
import type { Selector } from '@tokey/css-selector-parser';
import isVendorPrefixed from 'is-vendor-prefixed';

export const diagnostics = {
    UNKNOWN_STATE_USAGE: createDiagnosticReporter(
        '08001',
        'error',
        (name: string) => `unknown pseudo-class "${name}"`
    ),
};

// HOOKS

export const hooks = createFeature({
    transformSelectorNode({ context, selectorContext }) {
        const { inferredSelector, node, ruleOrAtRule, scopeSelectorAst } = selectorContext;
        if (node.type !== 'pseudo_class') {
            return;
        }
        // find matching custom state
        const name = node.value;
        const inferredState = inferredSelector.getPseudoClasses({ name })[name];
        const foundCustomState = !!inferredState;
        if (inferredState) {
            if (selectorContext.transform) {
                STCustomState.transformPseudoClassToCustomState(
                    inferredState.state,
                    inferredState.meta,
                    node.value,
                    node,
                    inferredState.meta.namespace,
                    context.resolver,
                    context.diagnostics,
                    ruleOrAtRule
                );
            }
        }

        // handle nested pseudo classes
        if (node.nodes && !foundCustomState) {
            if (node.value === 'global') {
                // ignore `:st-global` since it is handled after the mixin transformation
                if (selectorContext.experimentalSelectorInference) {
                    selectorContext.setNextSelectorScope(
                        [
                            {
                                _kind: 'css',
                                meta: context.meta,
                                symbol: CSSType.createSymbol({ name: '*' }),
                            },
                        ],
                        node
                    );
                }
                return;
            } else {
                const hasSubSelectors = node.value.match(
                    /not|any|-\w+?-any|matches|is|where|has|local|nth-child|nth-last-child/
                );
                // pickup all nested selectors except nth initial selector
                const innerSelectors = (
                    node.nodes[0] && node.nodes[0].type === `nth` ? node.nodes.slice(1) : node.nodes
                ) as Selector[];
                const nestedContext = selectorContext.createNestedContext(
                    innerSelectors,
                    selectorContext.inferredSelector
                );
                scopeSelectorAst(nestedContext);
                // change selector inference
                if (hasSubSelectors && innerSelectors.length) {
                    if (
                        selectorContext.experimentalSelectorInference &&
                        !node.value.match(/not|has/)
                    ) {
                        // set inferred to subject of nested selectors + prev compound
                        const prevNode = selectorContext.lastInferredSelectorNode;
                        if (prevNode && prevNode.type !== 'combinator') {
                            nestedContext.inferredMultipleSelectors.add(
                                selectorContext.inferredSelector
                            );
                        }
                        selectorContext.setNextSelectorScope(
                            nestedContext.inferredMultipleSelectors,
                            node
                        );
                    }
                    // legacy: delegate elements of first selector
                    selectorContext.elements[selectorContext.selectorIndex].push(
                        ...nestedContext.elements[0]
                    );
                }
            }
        }
        // warn unknown state
        if (
            !foundCustomState &&
            !nativePseudoClasses.includes(node.value) &&
            !isVendorPrefixed(node.value) &&
            !selectorContext.isDuplicateStScopeDiagnostic()
        ) {
            context.diagnostics.report(diagnostics.UNKNOWN_STATE_USAGE(node.value), {
                node: ruleOrAtRule,
                word: node.value,
            });
        }
    },
});
