import { createFeature, FeatureContext } from './feature';
import type { StylableDirectives } from './types';
import { generalDiagnostics } from './diagnostics';
import * as STSymbol from './st-symbol';
import type { StylableSymbol } from './st-symbol';
import type { ImportSymbol } from './st-import';
import * as STGlobal from './st-global';
import { getOriginDefinition } from '../helpers/resolve';
import { namespace } from '../helpers/namespace';
import { namespaceEscape, unescapeCSS } from '../helpers/escape';
import { convertToSelector, convertToClass, stringifySelector } from '../helpers/selector';
import type { StylableMeta } from '../stylable-meta';
import { validateRuleStateDefinition } from '../helpers/custom-state';
import type {
    ImmutableClass,
    Class,
    SelectorNode,
    ImmutableSelectorNode,
} from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';
import { createDiagnosticReporter } from '../diagnostics';

export interface ClassSymbol extends StylableDirectives {
    _kind: 'class';
    name: string;
    alias?: ImportSymbol;
    scoped?: string; // ToDo: check if in use
}

export const diagnostics = {
    INVALID_FUNCTIONAL_SELECTOR: generalDiagnostics.INVALID_FUNCTIONAL_SELECTOR,
    UNSCOPED_CLASS: createDiagnosticReporter(
        '00002',
        'warning',
        (name: string) =>
            `unscoped class "${name}" will affect all elements of the same type in the document`
    ),
    EMPTY_ST_GLOBAL: createDiagnosticReporter(
        '00003',
        'error',
        () => `-st-global must contain a valid selector`
    ),
    UNSUPPORTED_MULTI_SELECTORS_ST_GLOBAL: createDiagnosticReporter(
        '00004',
        'error',
        () => `unsupported multi selector in -st-global`
    ),
    IMPORT_ISNT_EXTENDABLE: createDiagnosticReporter(
        '00005',
        'error',
        () => 'import is not extendable'
    ),
    CANNOT_EXTEND_UNKNOWN_SYMBOL: createDiagnosticReporter(
        '00006',
        'error',
        (name: string) => `cannot extend unknown symbol "${name}"`
    ),
    CANNOT_EXTEND_JS: createDiagnosticReporter(
        '00007',
        'error',
        () => 'JS import is not extendable'
    ),
    UNKNOWN_IMPORT_ALIAS: createDiagnosticReporter(
        '00008',
        'error',
        (name: string) => `cannot use alias for unknown import "${name}"`
    ),
};

// HOOKS

export const hooks = createFeature<{
    SELECTOR: Class;
    IMMUTABLE_SELECTOR: ImmutableClass;
    RESOLVED: Record<string, string>;
}>({
    analyzeSelectorNode({ context, node, rule }): void {
        if (node.nodes) {
            // error on functional class
            context.diagnostics.report(
                diagnostics.INVALID_FUNCTIONAL_SELECTOR(`.` + node.value, `class`),
                {
                    node: rule,
                    word: stringifySelector(node),
                }
            );
        }
        addClass(context, node.value, rule);
    },
    transformResolve({ context }) {
        const resolvedSymbols = context.getResolvedSymbols(context.meta);
        const locals: Record<string, string> = {};
        for (const [localName, resolved] of Object.entries(resolvedSymbols.class)) {
            const exportedClasses = [];
            let first = true;
            // collect list of css classes for exports
            for (const { meta, symbol } of resolved) {
                if (!first && symbol[`-st-root`]) {
                    // extended stylesheet root: stop collection as root is expected to
                    // be placed by inner component, for example in <Button class={classes.primaryBtn} />
                    // `primaryBtn` shouldn't contain `button__root` as it is placed by the Button component
                    break;
                }
                first = false;
                if (symbol[`-st-global`]) {
                    // collect global override just in case of
                    // compound set of CSS classes
                    let isOnlyClasses = true;
                    const globalClasses = symbol[`-st-global`].reduce<string[]>(
                        (globalClasses, node) => {
                            if (node.type === `class`) {
                                globalClasses.push(node.value);
                            } else {
                                isOnlyClasses = false;
                            }
                            return globalClasses;
                        },
                        []
                    );
                    if (isOnlyClasses) {
                        exportedClasses.push(...globalClasses);
                    }
                    continue;
                }
                if (symbol.alias && !symbol[`-st-extends`]) {
                    continue;
                }
                exportedClasses.push(namespace(symbol.name, meta.namespace));
            }
            const classNames = unescapeCSS(exportedClasses.join(' '));
            if (classNames) {
                locals[localName] = classNames;
            }
        }
        return locals;
    },
    transformSelectorNode({ context, selectorContext, node }) {
        const { originMeta, resolver } = selectorContext;
        const resolvedSymbols = context.getResolvedSymbols(context.meta);
        const resolved = resolvedSymbols.class[node.value] || [
            // used to namespace classes from js mixins since js mixins
            // are scoped in the context of the mixed-in stylesheet
            // which might not have a definition for the mixed-in class
            { _kind: 'css', meta: originMeta, symbol: { _kind: 'class', name: node.value } },
        ];
        selectorContext.setCurrentAnchor({ name: node.value, type: 'class', resolved });
        const { symbol, meta } = getOriginDefinition(resolved);
        if (selectorContext.originMeta === meta && symbol[`-st-states`]) {
            // ToDo: refactor out to transformer validation phase
            validateRuleStateDefinition(
                selectorContext.rule,
                context.meta,
                resolver,
                context.diagnostics
            );
        }
        namespaceClass(meta, symbol, node, originMeta);
    },
    transformJSExports({ exports, resolved }) {
        Object.assign(exports.classes, resolved);
    },
});

// API

export function get(meta: StylableMeta, name: string): ClassSymbol | undefined {
    return STSymbol.get(meta, name, `class`);
}

export function getAll(meta: StylableMeta): Record<string, ClassSymbol> {
    return STSymbol.getAllByType(meta, `class`);
}

export function addClass(context: FeatureContext, name: string, rule?: postcss.Rule): ClassSymbol {
    if (!STSymbol.get(context.meta, name, `class`)) {
        let alias = STSymbol.get(context.meta, name);
        if (alias && alias._kind !== 'import') {
            alias = undefined;
        }
        STSymbol.addSymbol({
            context,
            symbol: {
                _kind: 'class',
                name,
                alias,
            },
            node: rule,
            safeRedeclare: !!alias,
        });
    }
    return STSymbol.get(context.meta, name, `class`)!;
}

export function namespaceClass(
    meta: StylableMeta,
    symbol: StylableSymbol,
    node: SelectorNode, // ToDo: check this is the correct type, should this be inline selector?
    originMeta: StylableMeta
) {
    if (`-st-global` in symbol && symbol[`-st-global`]) {
        // change node to `-st-global` value
        const flatNode = convertToSelector(node);
        const globalMappedNodes = symbol[`-st-global`]!;
        flatNode.nodes = globalMappedNodes;
        // ToDo: check if this is causes an issue with globals from an imported alias
        STGlobal.addGlobals(originMeta, globalMappedNodes);
    } else {
        node = convertToClass(node);
        node.value = namespaceEscape(symbol.name, meta.namespace);
    }
}

export function validateClassScoping({
    context,
    classSymbol,
    locallyScoped,
    reportUnscoped,
    node,
    nodes,
    index,
    rule,
}: {
    context: FeatureContext;
    classSymbol: ClassSymbol;
    locallyScoped: boolean;
    reportUnscoped: boolean;
    node: ImmutableClass;
    nodes: ImmutableSelectorNode[];
    index: number;
    rule: postcss.Rule;
}): boolean {
    if (!classSymbol.alias) {
        return true;
    } else if (locallyScoped === false) {
        if (checkForScopedNodeAfter(context, rule, nodes, index) === false) {
            if (reportUnscoped) {
                context.diagnostics.report(diagnostics.UNSCOPED_CLASS(node.value), {
                    node: rule,
                    word: node.value,
                });
            }
            return false;
        } else {
            return true;
        }
    }
    return locallyScoped;
}

// ToDo: support more complex cases (e.g. `:is`)
export function checkForScopedNodeAfter(
    context: FeatureContext,
    rule: postcss.Rule,
    nodes: ImmutableSelectorNode[],
    index: number
) {
    for (let i = index + 1; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node) {
            // ToDo: can this get here???
            break;
        }
        if (node.type === 'combinator') {
            break;
        }
        if (node.type === 'class') {
            const name = node.value;
            const classSymbol = addClass(context, name, rule);
            if (classSymbol && !classSymbol.alias) {
                return true;
            }
        }
    }
    return false;
}
