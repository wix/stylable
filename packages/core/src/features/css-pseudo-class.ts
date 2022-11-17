import { createFeature } from './feature';
import { nativePseudoClasses } from '../native-reserved-lists';
import * as STCustomState from './st-custom-state';
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
        const { currentAnchor, node, rule, scopeSelectorAst } = selectorContext;
        if (node.type !== 'pseudo_class') {
            return;
        }
        // find matching custom state
        let foundCustomState = false;
        for (const { symbol, meta } of currentAnchor.resolved) {
            const states = symbol[`-st-states`];
            if (states && Object.hasOwnProperty.call(states, node.value)) {
                foundCustomState = true;
                // transform custom state
                STCustomState.transformPseudoClassToCustomState(
                    states,
                    meta,
                    node.value,
                    node,
                    meta.namespace,
                    context.resolver,
                    context.diagnostics,
                    rule
                );
                break;
            }
        }
        // handle nested pseudo classes
        if (node.nodes && !foundCustomState) {
            if (node.value === 'global') {
                // ignore `:st-global` since it is handled after the mixin transformation
                return;
            } else {
                // pickup all nested selectors except nth initial selector
                const innerSelectors = (
                    node.nodes[0] && node.nodes[0].type === `nth` ? node.nodes.slice(1) : node.nodes
                ) as Selector[];
                const nestedContext = selectorContext.createNestedContext(innerSelectors);
                scopeSelectorAst(nestedContext);
                /**
                 * ToDo: remove once elements is deprecated!
                 * support deprecated elements.
                 * used to flatten nested elements for some native pseudo classes.
                 */
                if (node.value.match(/not|any|-\w+?-any|matches|is|where|has|local/)) {
                    // delegate elements of first selector
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
                node: rule,
                word: node.value,
            });
        }
    },
});
