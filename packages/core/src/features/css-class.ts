import { createFeature, FeatureContext } from './feature';
import type { StylableDirectives, ImportSymbol } from './types';
import { generalDiagnostics } from './diagnostics';
import * as STSymbol from './st-symbol';
import type { StylableSymbol } from './st-symbol';
import * as STGlobal from './st-global';
import { plugableRecord } from '../helpers/plugable-record';
import { getOriginDefinition } from '../helpers/resolve';
import { namespaceEscape } from '../helpers/escape';
import { convertToSelector, convertToClass, stringifySelector } from '../helpers/selector';
import type { StylableMeta } from '../stylable-meta';
import { valueMapping } from '../stylable-value-parsers';
import { validateRuleStateDefinition } from '../helpers/custom-state';
import { ignoreDeprecationWarn } from '../helpers/deprecation';
import type {
    ImmutableClass,
    Class,
    SelectorNode,
    ImmutableSelectorNode,
} from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';

export interface ClassSymbol extends StylableDirectives {
    _kind: 'class';
    name: string;
    alias?: ImportSymbol;
    scoped?: string; // ToDo: check if in use
}

const dataKey = plugableRecord.key<Record<string, ClassSymbol>>('classes');

export const diagnostics = {
    INVALID_FUNCTIONAL_SELECTOR: generalDiagnostics.INVALID_FUNCTIONAL_SELECTOR,
    UNSCOPED_CLASS(name: string) {
        return `unscoped class "${name}" will affect all elements of the same type in the document`;
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

export const hooks = createFeature<{ SELECTOR: Class; IMMUTABLE_SELECTOR: ImmutableClass }>({
    analyzeInit({ data }) {
        plugableRecord.set(data, dataKey, {});
    },
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
    transformSelectorNode({ context, selectorContext, node }) {
        const { originMeta, resolver } = selectorContext;
        const resolved = selectorContext.metaParts.class[node.value] || [
            // used to namespace classes from js mixins since js mixins
            // are scoped in the context of the mixed-in stylesheet
            // which might not have a definition for the mixed-in class
            { _kind: 'css', meta: originMeta, symbol: { _kind: 'class', name: node.value } },
        ];
        selectorContext.setCurrentAnchor({ name: node.value, type: 'class', resolved });
        const { symbol, meta } = getOriginDefinition(resolved);
        if (selectorContext.originMeta === meta && symbol[valueMapping.states]) {
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
});

// API

export function get({ data }: StylableMeta, name: string): ClassSymbol | undefined {
    const state = plugableRecord.getUnsafe(data, dataKey);
    return state[name];
}

export function getAll({ data }: StylableMeta): Record<string, ClassSymbol> {
    return plugableRecord.getUnsafe(data, dataKey);
}

export function addClass(context: FeatureContext, name: string, rule?: postcss.Rule): ClassSymbol {
    const cssClassData = plugableRecord.getUnsafe(context.meta.data, dataKey);
    let classSymbol = cssClassData[name];
    if (!classSymbol) {
        let alias = STSymbol.get(context.meta, name);
        if (alias && alias._kind !== 'import') {
            alias = undefined;
        }
        classSymbol = cssClassData[name] = {
            _kind: 'class',
            name,
            alias,
        };
        STSymbol.addSymbol({
            context,
            symbol: classSymbol,
            node: rule,
            safeRedeclare: !!alias,
        });
        // deprecated
        ignoreDeprecationWarn(() => {
            context.meta.classes[name] = classSymbol;
        });
    }
    return classSymbol;
}

export function namespaceClass(
    meta: StylableMeta,
    symbol: StylableSymbol,
    node: SelectorNode, // ToDo: check this is the correct type, should this be inline selector?
    originMeta: StylableMeta
) {
    if (valueMapping.global in symbol && symbol[valueMapping.global]) {
        // change node to `-st-global` value
        const flatNode = convertToSelector(node);
        const globalMappedNodes = symbol[valueMapping.global]!;
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
    inStScope,
    node,
    nodes,
    index,
    rule,
}: {
    context: FeatureContext;
    classSymbol: ClassSymbol;
    locallyScoped: boolean;
    inStScope: boolean;
    node: ImmutableClass;
    nodes: ImmutableSelectorNode[];
    index: number;
    rule: postcss.Rule;
}): boolean {
    if (!classSymbol.alias) {
        return true;
    } else if (locallyScoped === false && !inStScope) {
        if (checkForScopedNodeAfter(context, rule, nodes, index) === false) {
            context.diagnostics.warn(rule, diagnostics.UNSCOPED_CLASS(node.value), {
                word: node.value,
            });
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
