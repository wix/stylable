import { createFeature, FeatureContext } from './feature';
import { generalDiagnostics } from './diagnostics';
import * as STSymbol from './st-symbol';
import type { ImportSymbol } from './st-import';
import * as CSSClass from './css-class';
import type { StylableMeta } from '../stylable-meta';
import { isCompRoot, stringifySelector } from '../helpers/selector';
import { getOriginDefinition } from '../helpers/resolve';
import type { Type, ImmutableType, ImmutableSelectorNode } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';
import { createDiagnosticReporter } from '../diagnostics';

// ToDo: should probably consider removing StylableDirectives from this symbol
export interface ElementSymbol extends CSSClass.StPartDirectives {
    _kind: 'element';
    name: string;
    alias?: ImportSymbol;
}

export const diagnostics = {
    INVALID_FUNCTIONAL_SELECTOR: generalDiagnostics.INVALID_FUNCTIONAL_SELECTOR,
    UNSCOPED_TYPE_SELECTOR: createDiagnosticReporter(
        `03001`,
        'warning',
        (name: string) =>
            `unscoped type selector "${name}" will affect all elements of the same type in the document`
    ),
};

// HOOKS

export const hooks = createFeature<{
    SELECTOR: Type;
    IMMUTABLE_SELECTOR: ImmutableType;
}>({
    analyzeSelectorNode({ context, node, rule, walkContext: [_index, _nodes] }): void {
        if (node.nodes) {
            // error on functional type
            context.diagnostics.report(
                diagnostics.INVALID_FUNCTIONAL_SELECTOR(node.value, `type`),
                {
                    node: rule,
                    word: stringifySelector(node),
                }
            );
        }
        addType(context, node.value, rule);
    },
    transformSelectorNode({ context, node, selectorContext }): void {
        const resolvedSymbols = context.getResolvedSymbols(context.meta);
        let resolved = resolvedSymbols.element[node.value];
        if (!resolved) {
            const resolvedClass = resolvedSymbols.class[node.value];
            if (resolvedClass?.length > 1 && resolvedClass[0].symbol.alias) {
                // fallback to imported class alias for case that no actual
                // type selector was found in the source rules, but transform is
                // called with such selector externally (this happens for invalid selectors
                // during language service completions)
                resolved = resolvedSymbols.class[node.value];
            } else {
                // provides resolution for native elements
                // that are not collected by parts
                // or elements that are added by js mixin
                resolved = [
                    {
                        _kind: 'css',
                        meta: context.meta,
                        symbol: createSymbol({ name: '*' }),
                    },
                ];
            }
        }
        selectorContext.setNextSelectorScope(resolved, node, node.value);
        // native node does not resolve e.g. div
        if (selectorContext.transform && resolved && resolved.length > 1) {
            const { symbol, meta } = getOriginDefinition(resolved);
            if (symbol._kind === 'class') {
                CSSClass.namespaceClass(meta, symbol, node);
            } else {
                node.value = symbol.name;
            }
        }
    },
});

// API

export function get(meta: StylableMeta, name: string): ElementSymbol | undefined {
    return STSymbol.get(meta, name, `element`);
}

export function getAll(meta: StylableMeta): Record<string, ElementSymbol> {
    return STSymbol.getAllByType(meta, `element`);
}

export function createSymbol(input: Partial<ElementSymbol> & { name: string }): ElementSymbol {
    const parts = input['-st-parts'] || {};
    return { ...input, _kind: 'element', '-st-parts': parts };
}

export function addType(context: FeatureContext, name: string, rule?: postcss.Rule): ElementSymbol {
    const typeSymbol = STSymbol.get(context.meta, name, `element`);
    if (!typeSymbol && isCompRoot(name)) {
        let alias = STSymbol.get(context.meta, name);
        if (alias && alias._kind !== 'import') {
            alias = undefined;
        }
        STSymbol.addSymbol({
            context,
            symbol: createSymbol({ name, alias }),
            node: rule,
            safeRedeclare: !!alias,
        });
    }
    return STSymbol.get(context.meta, name, `element`)!;
}

export function validateTypeScoping({
    context,
    locallyScoped,
    reportUnscoped,
    node,
    nodes,
    index,
    rule,
}: {
    context: FeatureContext;
    locallyScoped: boolean;
    reportUnscoped: boolean;
    node: ImmutableType;
    nodes: ImmutableSelectorNode[];
    index: number;
    rule: postcss.Rule;
}): boolean {
    if (context.meta.type !== 'stylable') {
        // ignore in native CSS
        return true;
    }
    if (locallyScoped === false) {
        if (CSSClass.checkForScopedNodeAfter(context, rule, nodes, index) === false) {
            if (reportUnscoped) {
                context.diagnostics.report(diagnostics.UNSCOPED_TYPE_SELECTOR(node.value), {
                    node: rule,
                    word: node.value,
                });
            }
            return false;
        } else {
            locallyScoped = true;
        }
    }
    return locallyScoped;
}
