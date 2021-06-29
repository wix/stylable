import {
    SelectorAstNode,
    parseSelector,
    traverseNode,
    stringifySelector,
} from './deprecated-selector-utils';
import cloneDeep from 'lodash.clonedeep';

export function scopeSelector(
    scopeSelectorRule: string,
    targetSelectorRule: string,
    rootScopeLevel = false
): { selector: string; selectorAst: SelectorAstNode } {
    const scopingSelectorAst = parseSelector(scopeSelectorRule);
    const targetSelectorAst = parseSelector(targetSelectorRule);

    const nodes: any[] = [];
    targetSelectorAst.nodes.forEach((targetSelector) => {
        scopingSelectorAst.nodes.forEach((scopingSelector) => {
            const outputSelector: any = cloneDeep(targetSelector);

            outputSelector.before = scopingSelector.before || outputSelector.before;

            const first = outputSelector.nodes[0];
            const parentRef = first.type === 'invalid' && first.value === '&';
            const globalSelector = first.type === 'nested-pseudo-class' && first.name === 'global';

            const startsWithScoping = rootScopeLevel
                ? scopingSelector.nodes.every((node: any, i) => {
                      const o = outputSelector.nodes[i];
                      for (const k in node) {
                          if (node[k] !== o[k]) {
                              return false;
                          }
                      }
                      return true;
                  })
                : false;

            if (
                first &&
                first.type !== 'spacing' &&
                !parentRef &&
                !startsWithScoping &&
                !globalSelector
            ) {
                outputSelector.nodes.unshift(...cloneDeep(scopingSelector.nodes), {
                    type: 'spacing',
                    value: ' ',
                });
            }

            traverseNode(outputSelector, (node, i, nodes) => {
                if (node.type === 'invalid' && node.value === '&') {
                    nodes.splice(i, 1, ...cloneDeep(scopingSelector.nodes));
                }
            });

            nodes.push(outputSelector);
        });
    });

    scopingSelectorAst.nodes = nodes;

    return {
        selector: stringifySelector(scopingSelectorAst),
        selectorAst: scopingSelectorAst,
    };
}
