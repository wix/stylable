import {
    nativePseudoClasses,
    parseSelector,
    pseudoStates,
    SelectorAstNode,
    stringifySelector,
    traverseNode,
} from '@stylable/core';
import cloneDeep from 'lodash.clonedeep';
import postcss from 'postcss';

// This transformation is applied on target AST code
// Not Stylable source AST
const nativePseudoClassesMap = nativePseudoClasses.reduce((acc, name: string) => {
    acc[name] = true;
    return acc;
}, {} as Record<string, boolean>);

export const OVERRIDE_STATE_PREFIX = 'stylable-force-state-';

const { hasOwnProperty } = Object.prototype;

export const MATCH_STATE_CLASS = new RegExp(`^(.+?)${pseudoStates.booleanStateDelimiter}(.+)`);
export const MATCH_STATE_ATTR = new RegExp(
    `^class~="(.+?)${pseudoStates.booleanStateDelimiter}(.+)"`
);

export function createDataAttr(dataAttrPrefix: string, stateName: string, param?: string) {
    const paramWithValueExtraDil = param !== undefined ? pseudoStates.stateMiddleDelimiter : '';
    const statePart = param !== undefined ? pseudoStates.resolveStateParam(param) : '';
    return `${dataAttrPrefix}${paramWithValueExtraDil}${stateName}${statePart}`;
}

export function applyStylableForceStateSelectors(
    outputAst: postcss.Root,
    namespaceMapping: Record<string, boolean> | ((namespace: string) => boolean) = {},
    dataPrefix = OVERRIDE_STATE_PREFIX
) {
    const isKnownNamespace =
        typeof namespaceMapping === 'function'
            ? namespaceMapping
            : (name: string) => hasOwnProperty.call(namespaceMapping, name);

    const mapping: Record<string, string> = {};
    addForceStateSelectors(outputAst, {
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

export function addForceStateSelectors(ast: postcss.Root, context: AddForceStateSelectorsContext) {
    ast.walkRules((rule) => {
        const selectorAst = parseSelector(rule.selector);

        const overrideSelectors = selectorAst.nodes.reduce((selectors, selector) => {
            if (hasStates(selector, context)) {
                selectors.push(transformStates(cloneDeep(selector), context));
            }
            return selectors;
        }, [] as SelectorAstNode[]);

        if (overrideSelectors.length) {
            selectorAst.nodes.push(...overrideSelectors);
            rule.selector = stringifySelector(selectorAst);
        }
    });
}

function isNative(name: string) {
    return hasOwnProperty.call(nativePseudoClassesMap, name);
}

function hasStates(selector: SelectorAstNode, context: AddForceStateSelectorsContext) {
    let hasStates = false;
    traverseNode(selector, (node) => {
        if (node.type === 'pseudo-class') {
            return (hasStates = true);
        } else if (node.type === 'class' && context.isStateClassName(node.name)) {
            return (hasStates = true);
        } else if (node.type === 'attribute' && node.content && context.isStateAttr(node.content)) {
            return (hasStates = true);
        }
        return undefined;
    });
    return hasStates;
}

function transformStates(selector: SelectorAstNode, context: AddForceStateSelectorsContext) {
    traverseNode(selector, (node) => {
        if (node.type === 'pseudo-class') {
            node.type = 'attribute';
            node.content = isNative(node.name)
                ? context.getForceStateAttrContentFromNative(node.name)
                : context.getForceStateAttrContent(node.name);

            context.onMapping(node.name, node.content);
        } else if (node.type === 'class' && context.isStateClassName(node.name)) {
            node.type = 'attribute';
            const name = context.getStateClassName(node.name);
            node.content = context.getForceStateAttrContent(name);
            context.onMapping(name, node.content);
        } else if (node.type === 'attribute' && node.content && context.isStateAttr(node.content)) {
            node.type = 'attribute';
            const name = context.getStateAttr(node.content);
            node.content = context.getForceStateAttrContent(name);
            context.onMapping(name, node.content);
        }
    });
    return selector;
}
