import { createFeature, FeatureContext, FeatureTransformContext } from './feature';
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
import { ignoreDeprecationWarn } from '../helpers/deprecation';
import {
    ImmutableClass,
    Class,
    SelectorNode,
    ImmutableSelectorNode,
    stringifySelectorAst,
} from '@tokey/css-selector-parser';
import * as postcss from 'postcss';
import { basename } from 'path';

export interface ClassSymbol extends StylableDirectives {
    _kind: 'class';
    name: string;
    alias?: ImportSymbol;
    scoped?: string; // ToDo: check if in use
}

export const diagnostics = {
    INVALID_FUNCTIONAL_SELECTOR: generalDiagnostics.INVALID_FUNCTIONAL_SELECTOR,
    UNSCOPED_CLASS(name: string) {
        return `unscoped class "${name}" will affect all elements of the same type in the document`;
    },
    EMPTY_ST_GLOBAL() {
        return `-st-global must contain a valid selector`;
    },
    UNSUPPORTED_MULTI_SELECTORS_ST_GLOBAL() {
        return `unsupported multi selector in -st-global`;
    },
    // -st-extends
    IMPORT_ISNT_EXTENDABLE() {
        return 'import is not extendable';
    },
    CANNOT_EXTEND_UNKNOWN_SYMBOL(name: string) {
        return `cannot extend unknown symbol "${name}"`;
    },
    CANNOT_EXTEND_JS() {
        return 'JS import is not extendable';
    },
    UNKNOWN_IMPORT_ALIAS(name: string) {
        return `cannot use alias for unknown import "${name}"`;
    },
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
            context.diagnostics.error(
                rule,
                diagnostics.INVALID_FUNCTIONAL_SELECTOR(`.` + node.value, `class`),
                {
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
                                context.meta.globals[node.value] = true;
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
        // deprecated
        ignoreDeprecationWarn(() => {
            context.meta.classes[name] = STSymbol.get(context.meta, name, `class`)!;
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
function getNamespacedClass(meta: StylableMeta, symbol: StylableSymbol) {
    if (`-st-global` in symbol && symbol[`-st-global`]) {
        const selector = symbol[`-st-global`];
        return stringifySelectorAst(selector as any);
    } else {
        return '.' + namespaceEscape(symbol.name, meta.namespace);
    }
}

export function addDevRules({ getResolvedSymbols, meta }: FeatureTransformContext) {
    const resolvedSymbols = getResolvedSymbols(meta);
    for (const resolved of Object.values(resolvedSymbols.class)) {
        const a = resolved[0];
        if (resolved.length > 1 && a.symbol['-st-extends']) {
            const b = resolved[resolved.length - 1];
            meta.outputAst!.append(
                createWarningRule(
                    '.' + b.symbol.name,
                    getNamespacedClass(b.meta, b.symbol),
                    basename(b.meta.source),
                    '.' + a.symbol.name,
                    getNamespacedClass(a.meta, a.symbol),
                    basename(a.meta.source)
                )
            );
        }
    }
}

export function createWarningRule(
    extendedNode: string,
    scopedExtendedNode: string,
    extendedFile: string,
    extendingNode: string,
    scopedExtendingNode: string,
    extendingFile: string
) {
    const message = `"class extending component '${extendingNode} => ${scopedExtendingNode}' in stylesheet '${extendingFile}' was set on a node that does not extend '${extendedNode} => ${scopedExtendedNode}' from stylesheet '${extendedFile}'" !important`;
    return postcss.rule({
        selector: `${scopedExtendingNode}:not(${scopedExtendedNode})::before`,
        nodes: [
            postcss.decl({
                prop: 'content',
                value: message,
            }),
            postcss.decl({
                prop: 'display',
                value: `block !important`,
            }),
            postcss.decl({
                prop: 'font-family',
                value: `monospace !important`,
            }),
            postcss.decl({
                prop: 'background-color',
                value: `red !important`,
            }),
            postcss.decl({
                prop: 'color',
                value: `white !important`,
            }),
        ],
    });
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
                context.diagnostics.warn(rule, diagnostics.UNSCOPED_CLASS(node.value), {
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
