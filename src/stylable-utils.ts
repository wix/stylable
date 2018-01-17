import * as postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import { DeclStylableProps, Imported, SDecl, SRule, StylableMeta } from './stylable-processor';

import {
    createSimpleSelectorChecker,
    fixChunkOrdering,
    isNodeMatch,
    parseSelector,
    SelectorAstNode,
    stringifySelector,
    traverseNode
} from './selector-utils';
import { valueMapping } from './stylable-value-parsers';
import { Pojo } from './types';
const replaceRuleSelector = require('postcss-selector-matches/dist/replaceRuleSelector');
const cloneDeep = require('lodash.clonedeep');

export const CUSTOM_SELECTOR_RE = /:--[\w-]+/g;

export function isValidDeclaration(decl: postcss.Declaration) {
    return typeof decl.value === 'string';
}

export function expandCustomSelectors(
    rule: postcss.Rule, customSelectors: Pojo<string>, diagnostics?: Diagnostics): string {

    if (rule.selector.indexOf(':--') > -1) {
        rule.selector = rule.selector.replace(
            CUSTOM_SELECTOR_RE,
            (extensionName, _matches, selector) => {
                if (!customSelectors[extensionName] && diagnostics) {
                    diagnostics.warn(rule,
                        `The selector '${rule.selector}' is undefined`, { word: rule.selector });
                    return selector;
                }
                // TODO: support nested CustomSelectors
                return ':matches(' + customSelectors[extensionName] + ')';
            }
        );

        return rule.selector = transformMatchesOnRule(rule, false) as string;
    }
    return rule.selector;
}

export function transformMatchesOnRule(rule: postcss.Rule, lineBreak: boolean) {
    return replaceRuleSelector(rule, { lineBreak });
}

export function scopeSelector(scopeSelectorRule: string, targetSelectorRule: string, rootScopeLevel = false)
    : { selector: string, selectorAst: SelectorAstNode } {

    const scopingSelectorAst = parseSelector(scopeSelectorRule);
    const targetSelectorAst = parseSelector(targetSelectorRule);

    const nodes: any[] = [];
    targetSelectorAst.nodes.forEach(targetSelector => {

        scopingSelectorAst.nodes.forEach(scopingSelector => {

            const outputSelector = cloneDeep(targetSelector);

            outputSelector.before = scopingSelector.before || outputSelector.before;

            const first = outputSelector.nodes[0];
            const parentRef = first.type === 'invalid' && first.value === '&';

            const startsWithScoping = rootScopeLevel ? scopingSelector.nodes.every((node: any, i) => {
                const o = outputSelector.nodes[i];
                for (const k in node) {
                    if (node[k] !== o[k]) {
                        return false;
                    }
                }
                return true;
            }) : false;

            if (first && first.type !== 'spacing' && !parentRef && !startsWithScoping) {
                outputSelector.nodes.unshift(...cloneDeep(scopingSelector.nodes, true), {
                    type: 'spacing',
                    value: ' '
                });
            }

            traverseNode(outputSelector, (node, i, nodes) => {
                if (node.type === 'invalid' && node.value === '&') {
                    nodes.splice(i, 1, ...cloneDeep(scopingSelector.nodes, true));
                }
            });

            nodes.push(outputSelector);

        });

    });

    scopingSelectorAst.nodes = nodes;

    return {
        selector: stringifySelector(scopingSelectorAst),
        selectorAst: scopingSelectorAst
    };
}

export function mergeRules(mixinAst: postcss.Root, rule: postcss.Rule) {
    let mixinRoot: postcss.Rule | null = null;
    mixinAst.walkRules((mixinRule: postcss.Rule) => {
        if (mixinRule.selector === '&' && !mixinRoot) {
            mixinRoot = mixinRule;
        } else {
            const out = scopeSelector(rule.selector, mixinRule.selector);
            mixinRule.selector = out.selector;
            // mixinRule.selectorAst = out.selectorAst;
        }
    });

    if (mixinAst.nodes) {
        let nextRule: postcss.Rule | postcss.AtRule = rule;
        let mixinEntry: postcss.Declaration | null = null;

        rule.walkDecls(valueMapping.mixin, decl => {
            mixinEntry = decl;
        });
        if (!mixinEntry) {
            throw rule.error('missing mixin entry');
        }
        // TODO: handle rules before and after decl on entry
        mixinAst.nodes.slice().forEach((node: SRule | postcss.Declaration | postcss.AtRule) => {
            if (node === mixinRoot) {
                node.walkDecls(node => {
                    rule.insertBefore(mixinEntry!, node);
                });
            } else if (node.type === 'decl') {
                rule.insertBefore(mixinEntry!, node);
            } else if (node.type === 'rule' || node.type === 'atrule') {
                if (rule.parent.last === nextRule) {
                    rule.parent.append(node);
                } else {
                    rule.parent.insertAfter(nextRule, node);
                }
                nextRule = node;
            }
        });
    }

    return rule;
}

export function createSubsetAst<T extends postcss.Root | postcss.AtRule>(
    root: postcss.Root | postcss.AtRule,
    selectorPrefix: string,
    mixinTarget?: T,
    isRoot = false): T {
    // keyframes on class mixin?

    const prefixType = parseSelector(selectorPrefix).nodes[0].nodes[0];
    const containsPrefix = containsMatchInFistChunk.bind(null, prefixType);
    const mixinRoot = mixinTarget ? mixinTarget : postcss.root();

    root.nodes!.forEach(node => {
        if (node.type === 'rule') {
            const ast = isRoot ?
                scopeSelector(selectorPrefix, node.selector, true).selectorAst : parseSelector(node.selector);

            const matchesSelectors = isRoot ? ast.nodes : ast.nodes.filter(containsPrefix);

            if (matchesSelectors.length) {

                const selector = stringifySelector({
                    ...ast,
                    nodes: matchesSelectors.map(selectorNode => {

                        if (!isRoot) {
                            fixChunkOrdering(selectorNode, prefixType);
                        }

                        return destructiveReplaceNode(
                            selectorNode,
                            prefixType,
                            { type: 'invalid', value: '&' } as SelectorAstNode
                        );
                    })
                });

                mixinRoot.append(node.clone({ selector }));
            }
        } else if (node.type === 'atrule') {
            if (node.name === 'media') {
                const mediaSubset = createSubsetAst(node, selectorPrefix, postcss.atRule({
                    params: node.params,
                    name: node.name
                }), isRoot);
                if (mediaSubset.nodes) {
                    mixinRoot.append(mediaSubset);
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

export function removeUnusedRules(
    ast: postcss.Root,
    meta: StylableMeta,
    _import: Imported,
    usedFiles: string[],
    resolvePath: (ctx: string, path: string) => string): void {

    const isUnusedImport = usedFiles.indexOf(_import.from) === -1;

    if (isUnusedImport) {
        const symbols = Object.keys(_import.named).concat(_import.defaultExport);
        ast.walkRules((rule: SRule) => {
            let shouldOutput = true;
            traverseNode(rule.selectorAst, node => {
                if (symbols.indexOf(node.name) !== -1) {
                    return shouldOutput = false;
                }
                const symbol = meta.mappedSymbols[node.name];
                if (symbol && (symbol._kind === 'class' || symbol._kind === 'element')) {
                    let extend = symbol[valueMapping.extends];
                    extend = extend && extend._kind !== 'import' ? (extend.alias || extend) : extend;

                    if (extend && extend._kind === 'import' &&
                        usedFiles.indexOf(resolvePath(meta.source, extend.import.from)) === -1) {
                        return shouldOutput = false;
                    }
                }
                return undefined;
            });
            // TODO: optimize the multiple selectors
            if (!shouldOutput && rule.selectorAst.nodes.length <= 1) {
                rule.remove();
            }
        });
    }
}

export function findDeclaration(importNode: Imported, test: any) {
    const fromIndex = importNode.rule.nodes!.findIndex(test);
    return importNode.rule.nodes![fromIndex] as postcss.Declaration;
}

export function findRule(
    root: postcss.Root,
    selector: string,
    test: any = (statment: any) => statment.prop === valueMapping.extends) {

    let found: any = null;
    root.walkRules(selector, (rule: SRule) => {
        const declarationIndex = rule.nodes ? rule.nodes.findIndex(test) : -1;
        if (rule.isSimpleSelector && !!~declarationIndex) {
            found = rule.nodes![declarationIndex];
        }
    });
    return found;
}

export function getDeclStylable(decl: SDecl): DeclStylableProps {
    if (decl.stylable) {
        return decl.stylable;
    } else {
        decl.stylable = decl.stylable ?
            decl.stylable :
            { sourceValue: '' };
        return decl.stylable;
    }
}

function destructiveReplaceNode(
    ast: SelectorAstNode,
    matchNode: SelectorAstNode,
    replacementNode: SelectorAstNode) {

    traverseNode(ast, node => {
        if (isNodeMatch(node, matchNode)) {
            node.type = 'selector';
            node.nodes = [replacementNode];
        }
    });
    return ast;
}

function containsMatchInFistChunk(prefixType: SelectorAstNode, selectorNode: SelectorAstNode) {
    let isMatch = false;
    traverseNode(selectorNode, node => {
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
