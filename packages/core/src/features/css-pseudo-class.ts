import { createFeature } from './feature';
import { nativePseudoClasses } from '../native-reserved-lists';
import * as STCustomState from './st-custom-state';
import * as STCustomSelector from './st-custom-selector';
import { createDiagnosticReporter } from '../diagnostics';
import { parseSelectorWithCache } from '../helpers/selector';
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
        const { inferredSelector, node, rule, scopeSelectorAst } = selectorContext;
        if (node.type !== 'pseudo_class') {
            return;
        }
        // find matching custom state
        const resolved = inferredSelector.getSingleResolve();
        let foundCustomState = false;
        for (const { symbol, meta } of resolved) {
            // Handle node resolve mapping for custom-selector.
            // Currently custom selectors cannot get to this point in the process,
            // due to them being replaced at the beginning of the transform process.
            // However by using an internal process to analyze the context of selectors for
            // the language service, a source selector can reach this point without the initial
            // transform. This code keeps the custom selector untouched, but registers the AST it resolves to.
            // ToDo: in the future we want to move the custom selector transformation inline, or remove it all together.
            const customSelector =
                node.value.startsWith('--') &&
                symbol['-st-root'] &&
                STCustomSelector.getCustomSelectorExpended(meta, node.value.slice(2));
            if (customSelector) {
                const mappedSelectorAst = parseSelectorWithCache(customSelector, { clone: true });
                const mappedContext = selectorContext.createNestedContext(mappedSelectorAst);
                // ToDo: wrap in :is() to get intersection of selectors
                scopeSelectorAst(mappedContext);
                if (!mappedContext.inferredSelector.isEmpty()) {
                    // ToDo: support multi selector with: "selectorContext.multiSelectorScope"
                    selectorContext.setNextSelectorScope(mappedContext.inferredSelector, node); // doesn't add to the resolved elements
                }
                return; // this is not a state
            }
            //
            const states = symbol[`-st-states`];
            if (states && Object.hasOwnProperty.call(states, node.value)) {
                foundCustomState = true;
                // transform custom state
                if (selectorContext.transform) {
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
                }
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
                const nestedContext = selectorContext.createNestedContext(
                    innerSelectors,
                    selectorContext.inferredSelector
                );
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
