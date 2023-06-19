import { createFeature, FeatureContext, FeatureTransformContext } from './feature';
import { generalDiagnostics } from './diagnostics';
import * as STSymbol from './st-symbol';
import type { StylableSymbol } from './st-symbol';
import type { ImportSymbol } from './st-import';
import type { ElementSymbol } from './css-type';
import type * as STStructure from './st-structure';
import * as STCustomState from './st-custom-state';
import { getOriginDefinition } from '../helpers/resolve';
import { namespace } from '../helpers/namespace';
import { namespaceEscape, unescapeCSS } from '../helpers/escape';
import { getNamedArgs } from '../helpers/value';
import {
    convertToClass,
    stringifySelector,
    isSimpleSelector,
    parseSelectorWithCache,
    convertToPseudoClass,
    convertToSelector,
} from '../helpers/selector';
import { getAlias } from '../stylable-utils';
import type { StylableMeta } from '../stylable-meta';
import { validateRuleStateDefinition } from '../helpers/custom-state';
import type { Stylable } from '../stylable';
import {
    ImmutableClass,
    Class,
    SelectorNode,
    ImmutableSelectorNode,
    stringifySelectorAst,
    SelectorNodes,
} from '@tokey/css-selector-parser';
import * as postcss from 'postcss';
import { basename } from 'path';
import { createDiagnosticReporter } from '../diagnostics';
import postcssValueParser from 'postcss-value-parser';
import { plugableRecord } from '../helpers/plugable-record';

export interface StPartDirectives extends STStructure.HasParts, Partial<STCustomState.HasStates> {
    '-st-root'?: boolean;
    '-st-extends'?: ImportSymbol | ClassSymbol | ElementSymbol;
    '-st-global'?: SelectorNode[];
}

const stPartDirectives = {
    '-st-root': true,
    '-st-states': true,
    '-st-extends': true,
    '-st-global': true,
} as const;

export interface ClassSymbol extends StPartDirectives {
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
    STATE_DEFINITION_IN_ELEMENT: createDiagnosticReporter(
        '11002',
        'error',
        () => 'cannot define pseudo states inside a type selector'
    ),
    STATE_DEFINITION_IN_COMPLEX: createDiagnosticReporter(
        '11003',
        'error',
        () => 'cannot define pseudo states inside complex selectors'
    ),
    OVERRIDE_TYPED_RULE: createDiagnosticReporter(
        '11006',
        'warning',
        (key: string, name: string) => `override "${key}" on typed rule "${name}"`
    ),
    CANNOT_RESOLVE_EXTEND: createDiagnosticReporter(
        '11004',
        'error',
        (name: string) => `cannot resolve '-st-extends' type for '${name}'`
    ),
    CANNOT_EXTEND_IN_COMPLEX: createDiagnosticReporter(
        '11005',
        'error',
        () => `cannot define "-st-extends" inside a complex selector`
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
    DISABLED_DIRECTIVE: createDiagnosticReporter(
        '00009',
        'error',
        (className: string, directive: keyof typeof stPartDirectives) => {
            const alternative =
                directive === '-st-extends'
                    ? ` use "@st .${className} :is(.base)" instead`
                    : directive === '-st-global'
                    ? `use "@st .${className} => :global(<selector>)" instead`
                    : directive === '-st-states'
                    ? `use "@st .${className} { @st .state; }" instead`
                    : '';
            return `cannot use ${directive} on .${className} since class is defined with "@st" - ${alternative}`;
        }
    ),
};

const dataKey = plugableRecord.key<{
    classesDefinedWithAtSt: Set<string>;
}>('st-structure');

// HOOKS

export const hooks = createFeature<{
    SELECTOR: Class;
    IMMUTABLE_SELECTOR: ImmutableClass;
    RESOLVED: Record<string, string>;
}>({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, {
            classesDefinedWithAtSt: new Set<string>(),
        });
    },
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
    analyzeDeclaration({ context, decl }) {
        if (context.meta.type === 'stylable' && isDirectiveDeclaration(decl)) {
            handleDirectives(context, decl);
        }
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
            { _kind: 'css', meta: originMeta, symbol: createSymbol({ name: node.value }) },
        ];
        selectorContext.setNextSelectorScope(resolved, node, node.value);
        const { symbol, meta } = getOriginDefinition(resolved);
        if (selectorContext.originMeta === meta && symbol[`-st-states`]) {
            // ToDo: refactor out to transformer validation phase
            validateRuleStateDefinition(
                selectorContext.selectorStr,
                selectorContext.ruleOrAtRule,
                context.meta,
                resolver,
                context.diagnostics
            );
        }
        if (selectorContext.transform) {
            namespaceClass(meta, symbol, node);
        }
    },
    transformJSExports({ exports, resolved }) {
        Object.assign(exports.classes, resolved);
    },
});

// API

export class StylablePublicApi {
    constructor(private stylable: Stylable) {}
    public transformIntoSelector(meta: StylableMeta, name: string): string | undefined {
        const localSymbol = STSymbol.get(meta, name);
        const resolved =
            localSymbol?._kind === 'import'
                ? this.stylable.resolver.deepResolve(localSymbol)
                : { _kind: 'css', meta, symbol: localSymbol };

        if (resolved?._kind !== 'css' || resolved.symbol?._kind !== 'class') {
            return undefined;
        }

        const node: Class = {
            type: 'class',
            value: '',
            start: 0,
            end: 0,
            dotComments: [],
        };
        namespaceClass(resolved.meta, resolved.symbol, node, false);
        return stringifySelectorAst(node);
    }
}

export function get(meta: StylableMeta, name: string): ClassSymbol | undefined {
    return STSymbol.get(meta, name, `class`);
}

export function getAll(meta: StylableMeta): Record<string, ClassSymbol> {
    return STSymbol.getAllByType(meta, `class`);
}

export function createSymbol(input: Partial<ClassSymbol> & { name: string }): ClassSymbol {
    const parts = input['-st-parts'] || {};
    return { ...input, _kind: 'class', '-st-parts': parts };
}

export function addClass(context: FeatureContext, name: string, rule?: postcss.Node): ClassSymbol {
    let symbol = STSymbol.get(context.meta, name, `class`);
    if (!symbol) {
        let alias = STSymbol.get(context.meta, name);
        if (alias && alias._kind !== 'import') {
            alias = undefined;
        }
        symbol = STSymbol.addSymbol({
            context,
            symbol: createSymbol({ name, alias }),
            node: rule,
            safeRedeclare: !!alias,
        }) as ClassSymbol;
    }
    // mark native css as global
    if (context.meta.type === 'css' && !symbol['-st-global']) {
        symbol['-st-global'] = [
            {
                type: 'class',
                value: name,
                dotComments: [],
                start: 0,
                end: 0,
            },
        ];
    }
    return symbol;
}

export function namespaceClass(
    meta: StylableMeta,
    symbol: StylableSymbol,
    node: SelectorNode, // ToDo: check this is the correct type, should this be inline selector?
    wrapInGlobal = true
) {
    if (`-st-global` in symbol && symbol[`-st-global`]) {
        // change node to `-st-global` value
        if (wrapInGlobal) {
            const globalMappedNodes = symbol[`-st-global`]!;
            convertToPseudoClass(node, 'global', [
                {
                    type: 'selector',
                    nodes: globalMappedNodes,
                    after: '',
                    before: '',
                    end: 0,
                    start: 0,
                },
            ]);
        } else {
            const flatNode = convertToSelector(node);
            const globalMappedNodes = symbol[`-st-global`]!;
            flatNode.nodes = globalMappedNodes;
        }
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
            meta.targetAst!.append(
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
        raws: { between: ' ' },
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
    if (context.meta.type !== 'stylable') {
        // ignore in native CSS
        return true;
    }
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

function isDirectiveDeclaration(
    decl: postcss.Declaration
): decl is postcss.Declaration & { prop: keyof typeof stPartDirectives } {
    return decl.prop in stPartDirectives;
}
export function disableDirectivesForClass(context: FeatureContext, className: string) {
    // ToDo: move directive analyze to @st-structure
    // called when class is defined with @st
    const { classesDefinedWithAtSt } = plugableRecord.getUnsafe(context.meta.data, dataKey);
    classesDefinedWithAtSt.add(className);
}

function handleDirectives(
    context: FeatureContext,
    decl: postcss.Declaration & { prop: keyof typeof stPartDirectives }
) {
    const rule = decl.parent as postcss.Rule;
    if (rule?.type !== 'rule') {
        return;
    }
    const isSimplePerSelector = isSimpleSelector(rule.selector);
    const type = isSimplePerSelector.reduce((accType, { type }) => {
        return !accType ? type : accType !== type ? `complex` : type;
    }, `` as (typeof isSimplePerSelector)[number]['type']);
    const isSimple = type !== `complex`;

    const { classesDefinedWithAtSt } = plugableRecord.getUnsafe(context.meta.data, dataKey);
    if (type === 'class' && classesDefinedWithAtSt.has(rule.selector.replace('.', ''))) {
        context.diagnostics.report(
            diagnostics.DISABLED_DIRECTIVE(rule.selector.replace('.', ''), decl.prop),
            {
                node: decl,
            }
        );
        return;
    } else if (decl.prop === `-st-states`) {
        if (isSimple && type !== 'type') {
            extendTypedRule(
                context,
                decl,
                rule.selector,
                `-st-states`,
                STCustomState.parsePseudoStates(decl.value, decl, context.diagnostics)
            );
        } else {
            if (type === 'type') {
                context.diagnostics.report(diagnostics.STATE_DEFINITION_IN_ELEMENT(), {
                    node: decl,
                });
            } else {
                context.diagnostics.report(diagnostics.STATE_DEFINITION_IN_COMPLEX(), {
                    node: decl,
                });
            }
        }
    } else if (decl.prop === `-st-extends`) {
        if (isSimple) {
            const parsed = parseStExtends(decl.value);
            const symbolName = parsed.types[0] && parsed.types[0].symbolName;

            const extendsRefSymbol = STSymbol.get(context.meta, symbolName)!;
            if (
                (extendsRefSymbol &&
                    (extendsRefSymbol._kind === 'import' ||
                        extendsRefSymbol._kind === 'class' ||
                        extendsRefSymbol._kind === 'element')) ||
                decl.value === context.meta.root
            ) {
                extendTypedRule(
                    context,
                    decl,
                    rule.selector,
                    `-st-extends`,
                    getAlias(extendsRefSymbol) || extendsRefSymbol
                );
            } else {
                context.diagnostics.report(diagnostics.CANNOT_RESOLVE_EXTEND(decl.value), {
                    node: decl,
                    word: decl.value,
                });
            }
        } else {
            context.diagnostics.report(diagnostics.CANNOT_EXTEND_IN_COMPLEX(), {
                node: decl,
            });
        }
    } else if (decl.prop === `-st-global`) {
        if (isSimple && type !== 'type') {
            // set class global mapping
            const name = rule.selector.replace('.', '');
            const classSymbol = get(context.meta, name);
            if (classSymbol) {
                const globalSelectorAst = parseStGlobal(context, decl);
                if (globalSelectorAst) {
                    classSymbol[`-st-global`] = globalSelectorAst;
                }
            }
        } else {
            // TODO: diagnostics - scoped on none class
        }
    }
}

export function extendTypedRule(
    context: FeatureContext,
    node: postcss.Node,
    selector: string,
    key: keyof StPartDirectives,
    value: any
) {
    const name = selector.replace('.', '');
    const typedRule = STSymbol.get(context.meta, name) as ClassSymbol | ElementSymbol;
    if (typedRule && typedRule[key]) {
        context.diagnostics.report(diagnostics.OVERRIDE_TYPED_RULE(key, name), {
            node,
            word: name,
        });
    }
    if (typedRule) {
        typedRule[key] = value;
    }
}

export interface ArgValue {
    type: string;
    value: string;
}
export interface ExtendsValue {
    symbolName: string;
    args: ArgValue[][] | null;
}

export function parseStExtends(value: string) {
    const ast = postcssValueParser(value);
    const types: ExtendsValue[] = [];

    ast.walk((node) => {
        if (node.type === 'function') {
            const args = getNamedArgs(node);

            types.push({
                symbolName: node.value,
                args,
            });

            return false;
        } else if (node.type === 'word') {
            types.push({
                symbolName: node.value,
                args: null,
            });
        }
        return undefined;
    }, false);

    return {
        ast,
        types,
    };
}
function parseStGlobal(
    context: FeatureContext,
    decl: postcss.Declaration
): SelectorNodes | undefined {
    const selector = parseSelectorWithCache(decl.value.replace(/^['"]/, '').replace(/['"]$/, ''), {
        clone: true,
    });
    if (!selector[0]) {
        context.diagnostics.report(diagnostics.EMPTY_ST_GLOBAL(), {
            node: decl,
        });
        return;
    } else if (selector.length > 1) {
        context.diagnostics.report(diagnostics.UNSUPPORTED_MULTI_SELECTORS_ST_GLOBAL(), {
            node: decl,
        });
    }
    return selector[0].nodes;
}
