import * as postcss from 'postcss';
import { nativePseudoClasses, parseSelector, Pojo, SelectorAstNode, stringifySelector, traverseNode } from 'stylable';
const cloneDeep = require('lodash.clonedeep');

const nativePseudoClassesMap = nativePseudoClasses.reduce(
  (acc, name) => { acc[name] = true; return acc; }, {} as Pojo<boolean>);

export const OVERRIDE_STATE_PREFIX = 'stylable-force-state-';

export function applyStylableForceStateSelectors(
  outputAst: postcss.Root, namespaceMapping = {} as Pojo<boolean>, dataPrefix = OVERRIDE_STATE_PREFIX
) {
  const mapping: Pojo<string> = {};
  addForceStateSelectors(outputAst, {
    getForceStateAttrContentFromNative(name) {
      return this.getForceStateAttrContent(name);
    },
    getForceStateAttrContent(name) {
      return dataPrefix + name;
    },
    getStateAttrName(content) {
      const parts = content.match(/^data-.+-(.+)=?/);
      const name = parts![1];
      return name;
    },
    isStateAttr(content) {
      const parts = content.match(/^data-(.+)-.+/);
      return parts ? namespaceMapping.hasOwnProperty(parts[1]) : false;
    },
    onMapping(key, value) {
      mapping[key] = value;
      mapping[value] = key;
    }
  });
  return mapping;
}

export interface AddForceStateSelectorsContext {
  getForceStateAttrContentFromNative(name: string): string;
  getForceStateAttrContent(name: string): string;
  getStateAttrName(content: string): string;
  isStateAttr(content: string): boolean;
  onMapping(key: string, value: string): void;
}

export function addForceStateSelectors(ast: postcss.Root, context: AddForceStateSelectorsContext) {
  ast.walkRules(rule => {
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
  return nativePseudoClassesMap.hasOwnProperty(name);
}

function hasStates(selector: SelectorAstNode, context: AddForceStateSelectorsContext) {
  let hasStates = false;
  traverseNode(selector, node => {
    if (node.type === 'pseudo-class') {
      return hasStates = true;
    } else if (node.type === 'attribute' && context.isStateAttr(node.content!)) {
      return hasStates = true;
    }
    return undefined;
  });
  return hasStates;
}

function transformStates(selector: SelectorAstNode, context: AddForceStateSelectorsContext) {
  traverseNode(selector, node => {
    if (node.type === 'pseudo-class') {
      node.type = 'attribute';
      node.content = isNative(node.name) ?
        context.getForceStateAttrContentFromNative(node.name) :
        context.getForceStateAttrContent(node.name);

      context.onMapping(node.name, node.content);
    } else if (node.type === 'attribute' && context.isStateAttr(node.content!)) {
      const name = context.getStateAttrName(node.content!);
      node.content = context.getForceStateAttrContent(name);
      context.onMapping(name, node.content);
    }
  });
  return selector;
}
