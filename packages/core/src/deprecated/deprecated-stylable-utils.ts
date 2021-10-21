import {
    SelectorAstNode,
    parseSelector,
    traverseNode,
    stringifySelector,
    fixChunkOrdering,
    isNodeMatch,
} from './deprecated-selector-utils';
import type { SRule } from './postcss-ast-extension';
import type { Imported, StylableMeta } from '../stylable-processor';
import { valueMapping } from '../stylable-value-parsers';
import cloneDeep from 'lodash.clonedeep';
import * as postcss from 'postcss';

/** new version scopeNestedSelector at selector.ts */
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

/** new version createSubsetAst at rule.ts */
export function createSubsetAst<T extends postcss.Root | postcss.AtRule>(
    root: postcss.Root | postcss.AtRule,
    selectorPrefix: string,
    mixinTarget?: T,
    isRoot = false
): T {
    // keyframes on class mixin?

    const prefixType = parseSelector(selectorPrefix).nodes[0].nodes[0];
    const containsPrefix = containsMatchInFirstChunk.bind(null, prefixType);
    const mixinRoot = mixinTarget ? mixinTarget : postcss.root();

    root.nodes.forEach((node) => {
        if (node.type === 'rule') {
            const ast = isRoot
                ? scopeSelector(selectorPrefix, node.selector, true).selectorAst
                : parseSelector(node.selector);

            const matchesSelectors = isRoot
                ? ast.nodes
                : ast.nodes.filter((node) => containsPrefix(node));

            if (matchesSelectors.length) {
                const selector = stringifySelector({
                    ...ast,
                    nodes: matchesSelectors.map((selectorNode) => {
                        if (!isRoot) {
                            fixChunkOrdering(selectorNode, prefixType);
                        }

                        return destructiveReplaceNode(selectorNode, prefixType, {
                            type: 'invalid',
                            value: '&',
                        } as SelectorAstNode);
                    }),
                });

                mixinRoot.append(node.clone({ selector }));
            }
        } else if (node.type === 'atrule') {
            if (node.name === 'media' || node.name === 'supports') {
                const atRuleSubset = createSubsetAst(
                    node,
                    selectorPrefix,
                    postcss.atRule({
                        params: node.params,
                        name: node.name,
                    }),
                    isRoot
                );
                if (atRuleSubset.nodes) {
                    mixinRoot.append(atRuleSubset);
                }
            } else if (isRoot) {
                mixinRoot.append(node.clone());
            }
        } else {
            // TODO: add warn?
        }
    });

    return mixinRoot as T;
}
function destructiveReplaceNode(
    ast: SelectorAstNode,
    matchNode: SelectorAstNode,
    replacementNode: SelectorAstNode
) {
    traverseNode(ast, (node) => {
        if (isNodeMatch(node, matchNode)) {
            node.type = 'selector';
            node.nodes = [replacementNode];
        }
    });
    return ast;
}
function containsMatchInFirstChunk(prefixType: SelectorAstNode, selectorNode: SelectorAstNode) {
    let isMatch = false;
    traverseNode(selectorNode, (node) => {
        if (node.type === 'operator' || node.type === 'spacing') {
            return false;
        } else if (node.type === 'nested-pseudo-class') {
            return true;
        } else if (isNodeMatch(node, prefixType)) {
            isMatch = true;
            return false;
        }
        return undefined;
    });
    return isMatch;
}

export function removeUnusedRules(
    ast: postcss.Root,
    meta: StylableMeta,
    _import: Imported,
    usedFiles: string[],
    resolvePath: (ctx: string, path: string) => string
): void {
    const isUnusedImport = !usedFiles.includes(_import.from);

    if (isUnusedImport) {
        const symbols = Object.keys(_import.named).concat(_import.defaultExport); // .filter(Boolean);
        ast.walkRules((rule) => {
            let shouldOutput = true;
            traverseNode((rule as SRule).selectorAst, (node) => {
                // TODO: remove.
                if (symbols.includes(node.name)) {
                    return (shouldOutput = false);
                }
                const symbol = meta.mappedSymbols[node.name];
                if (symbol && (symbol._kind === 'class' || symbol._kind === 'element')) {
                    let extend = symbol[valueMapping.extends] || symbol.alias;
                    extend = extend && extend._kind !== 'import' ? extend.alias || extend : extend;

                    if (
                        extend &&
                        extend._kind === 'import' &&
                        !usedFiles.includes(resolvePath(meta.source, extend.import.from))
                    ) {
                        return (shouldOutput = false);
                    }
                }
                return undefined;
            });
            // TODO: optimize the multiple selectors
            if (!shouldOutput && (rule as SRule).selectorAst.nodes.length <= 1) {
                rule.remove();
            }
        });
    }
}

export function findRule(
    root: postcss.Root,
    selector: string,
    test: any = (statement: any) => statement.prop === valueMapping.extends
): null | postcss.Declaration {
    let found: any = null;
    root.walkRules(selector, (rule) => {
        const declarationIndex = rule.nodes ? rule.nodes.findIndex(test) : -1;
        if ((rule as SRule).isSimpleSelector && !!~declarationIndex) {
            found = rule.nodes[declarationIndex];
        }
    });
    return found;
}
