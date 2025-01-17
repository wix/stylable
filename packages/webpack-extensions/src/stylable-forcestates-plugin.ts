import { nativePseudoClasses, STCustomState } from '@stylable/core/dist/index-internal';
import {
    parseCssSelector,
    stringifySelectorAst,
    walk,
    SelectorList,
    Selector,
    SelectorNode,
    Attribute,
} from '@tokey/css-selector-parser';
import cloneDeep from 'lodash.clonedeep';
import type * as postcss from 'postcss';
export * from './create-forcestate-matchers.js';

// This transformation is applied on target AST code
// Not Stylable source AST
const nativePseudoClassesMap = nativePseudoClasses.reduce(
    (acc, name: string) => {
        acc[name] = true;
        return acc;
    },
    {} as Record<string, boolean>,
);

export const OVERRIDE_STATE_PREFIX = 'stylable-force-state-';

const { hasOwnProperty } = Object.prototype;

export const MATCH_STATE_CLASS = new RegExp(
    `^(.+?)${STCustomState.delimiters.booleanStateDelimiter}(.+)`,
);
export const MATCH_STATE_ATTR = new RegExp(
    `^class~="(.+?)${STCustomState.delimiters.booleanStateDelimiter}(.+)"`,
);

export function createDataAttr(dataAttrPrefix: string, stateName: string, param?: string) {
    const paramWithValueExtraDil =
        param !== undefined ? STCustomState.delimiters.stateMiddleDelimiter : '';
    const statePart = param !== undefined ? STCustomState.resolveStateParam(param) : '';
    return `${dataAttrPrefix}${paramWithValueExtraDil}${stateName}${statePart}`;
}
/**
 *
 * @param targetAst - target ast to transform
 * @param namespaceMapping - known namespaces (use to detect framework specific namespaces like Stylable)
 * @param dataPrefix - prefix for the data attribute
 * @param plugin - plugin to override the context
 */
export function applyStylableForceStateSelectors(
    targetAst: postcss.Root,
    namespaceMapping: Record<string, boolean> | ((namespace: string) => boolean) = {},
    dataPrefix = OVERRIDE_STATE_PREFIX,
    plugin: (ctx: AddForceStateSelectorsContext) => AddForceStateSelectorsContext = (id) => id,
) {
    const mapping: Record<string, string> = {};
    addForceStateSelectors(
        targetAst,
        createForceStatesContext(dataPrefix, namespaceMapping, mapping, plugin),
    );
    return mapping;
}

export interface AddForceStateSelectorsContext {
    getForceStateAttrContentFromNative(name: string): string;
    getForceStateAttrContent(name: string): string;
    getStateClassName(content: string): string;
    getStateAttr(content: string): string;
    isStateClassName(content: string): boolean;
    isStateAttr(content: string): boolean;
    onMapping(key: string, value: string): void;
}

/**
 * adds force state selectors to the entire ast
 * @param targetAst - target ast to transform
 * @param context - context to use for the transformation
 */
export function addForceStateSelectors(
    targetAst: postcss.Root,
    context: AddForceStateSelectorsContext,
) {
    targetAst.walkRules((rule) =>
        mutateWithForceStates(parseCssSelector(rule.selector), context, rule),
    );
}
/**
 * creates a context to share across the transformation of addForceStateSelectors
 * @param dataPrefix - prefix for the data attribute
 * @param namespaceMapping - known namespaces (use to detect framework specific namespaces like Stylable)
 * @param mapping - mapping of the original state to the override state
 * @param plugin - plugin to override the context
 */
export function createForceStatesContext(
    dataPrefix: string,
    namespaceMapping: Record<string, boolean> | ((namespace: string) => boolean),
    mapping: Record<string, string>,
    plugin: (ctx: AddForceStateSelectorsContext) => AddForceStateSelectorsContext,
) {
    const isKnownNamespace =
        typeof namespaceMapping === 'function'
            ? namespaceMapping
            : (name: string) => hasOwnProperty.call(namespaceMapping, name);

    return plugin({
        getForceStateAttrContentFromNative(name) {
            return this.getForceStateAttrContent(name);
        },
        getForceStateAttrContent(name) {
            return dataPrefix + name;
        },
        getStateClassName(name) {
            const parts = name.match(MATCH_STATE_CLASS);
            return parts![2];
        },
        getStateAttr(content) {
            const parts = content.match(MATCH_STATE_ATTR);
            return parts![2];
        },
        isStateClassName(name) {
            const parts = name.match(MATCH_STATE_CLASS);
            return parts ? isKnownNamespace(parts[1]) : false;
        },
        isStateAttr(content) {
            const parts = content.match(MATCH_STATE_ATTR);
            return parts ? isKnownNamespace(parts[1]) : false;
        },
        onMapping(key, value) {
            mapping[key] = value;
            mapping[value] = key;
        },
    });
}

/**
 *
 * @param selectorAst - selector ast to override
 * @param context - context to use for the transformation
 * @param rule - optional rule to update the selector on (if not provided only the selector ast will be mutated)
 */
export function mutateWithForceStates(
    selectorAst: SelectorList,
    context: AddForceStateSelectorsContext,
    rule?: postcss.Rule,
) {
    const overrideSelectors: SelectorList = [];
    for (const selector of selectorAst) {
        if (hasStates(selector, context)) {
            overrideSelectors.push(transformStates(cloneDeep(selector), context));
        }
    }

    if (overrideSelectors.length) {
        selectorAst.push(...overrideSelectors);
        if (rule) {
            rule.selector = stringifySelectorAst(selectorAst);
        }
    }
}

function isNative(name: string) {
    return hasOwnProperty.call(nativePseudoClassesMap, name);
}

function hasStates(selector: Selector, context: AddForceStateSelectorsContext) {
    let hasStates = false;
    walk(selector, (node) => {
        if (
            node.type === 'pseudo_class' ||
            (node.type === 'class' && context.isStateClassName(node.value)) ||
            (node.type === 'attribute' && node.value && context.isStateAttr(node.value))
        ) {
            hasStates = true;
            return walk.skipNested;
        }
        return;
    });
    return hasStates;
}

function convertToAttribute(node: SelectorNode): Attribute {
    const castNode = node as Attribute;
    castNode.type = `attribute`;
    return castNode;
}

function transformStates(selector: Selector, context: AddForceStateSelectorsContext) {
    walk(selector, (node) => {
        if (node.type === 'pseudo_class') {
            const name = node.value;
            convertToAttribute(node).value = isNative(node.value)
                ? context.getForceStateAttrContentFromNative(node.value)
                : context.getForceStateAttrContent(node.value);

            context.onMapping(name, node.value);
        } else if (node.type === 'class' && context.isStateClassName(node.value)) {
            const name = context.getStateClassName(node.value);
            convertToAttribute(node).value = context.getForceStateAttrContent(name);
            context.onMapping(name, node.value);
        } else if (node.type === 'attribute' && node.value && context.isStateAttr(node.value)) {
            const name = context.getStateAttr(node.value);
            convertToAttribute(node).value = context.getForceStateAttrContent(name);
            context.onMapping(name, node.value);
        }
    });
    return selector;
}
