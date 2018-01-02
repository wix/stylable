import * as postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import { parseSelector, SelectorAstNode, stringifySelector, traverseNode } from './selector-utils';
import { DeclStylableProps, Imported, SDecl, SRule, StylableMeta } from './stylable-processor';
import { valueMapping } from './stylable-value-parsers';
const replaceRuleSelector = require('postcss-selector-matches/dist/replaceRuleSelector');
const cloneDeep = require('lodash.clonedeep');

export const CUSTOM_SELECTOR_RE = /:--[\w-]+/g;

export function isValidDeclaration(decl: postcss.Declaration) {
    return typeof decl.value === 'string';
}

export function transformMatchesOnRule(rule: postcss.Rule, lineBreak: boolean) {
    return replaceRuleSelector(rule, { lineBreak });
}

export function scopeSelector(scopeSelector: string, targetSelector: string)
: { selector: string, selectorAst: SelectorAstNode } {

    const ruleSelectorAst = parseSelector(scopeSelector);
    const mixinSelectorAst = parseSelector(targetSelector);

    const nodes: any[] = [];
    mixinSelectorAst.nodes.forEach(mixinSelector => {

        ruleSelectorAst.nodes.forEach(ruleSelector => {
            const m: any[] = cloneDeep(mixinSelector.nodes);
            const first = m[0];

            if (first && first.type === 'invalid' && first.value === '&') {
                m.splice(0, 1);
            } else if (first && first.type !== 'spacing') {
                m.unshift({
                    type: 'spacing',
                    value: ' '
                });
            }
            nodes.push({
                type: 'selector',
                before: ruleSelector.before || mixinSelector.before,
                nodes: cloneDeep(ruleSelector.nodes, true).concat(m)
            });
        });

    });

    ruleSelectorAst.nodes = nodes;

    return {
        selector: stringifySelector(ruleSelectorAst),
        selectorAst: ruleSelectorAst
    };
}

export function mergeRules(mixinRoot: postcss.Root, rule: SRule, diagnostics?: Diagnostics) {
    mixinRoot.walkRules((mixinRule: SRule) => {
        const out = scopeSelector(rule.selector, mixinRule.selector);
        mixinRule.selector = out.selector;
        mixinRule.selectorAst = out.selectorAst;
    });

    if (mixinRoot.nodes) {
        let nextRule = rule;
        let mixinEntry: postcss.Declaration | null = null;

        rule.walkDecls(valueMapping.mixin, decl => {
            mixinEntry = decl;
        });
        if (!mixinEntry) {
            throw rule.error('missing mixin entry');
        }
        mixinRoot.nodes.slice().forEach((node: SRule | postcss.Declaration | postcss.AtRule) => {
            if (node.type === 'decl') {
                if (isValidDeclaration(node)) {
                    rule.insertBefore(mixinEntry!, node);
                } else if (diagnostics) {
                    diagnostics.warn(
                        mixinEntry!,
                        `not a valid mixin declaration ${mixinEntry!.value}`,
                        { word: mixinEntry!.value }
                    );
                }
            } else if (node.type === 'rule') {
                if (rule.parent.last === nextRule) {
                    rule.parent.append(node);
                } else {
                    rule.parent.insertAfter(nextRule, node);
                }
                const toRemove: postcss.Declaration[] = [];
                node.walkDecls(decl => {
                    if (!isValidDeclaration(decl)) {
                        toRemove.push(decl);
                        if (diagnostics) {
                            diagnostics.warn(
                                mixinEntry!,
                                `not a valid mixin declaration '${decl.prop}', and was removed`,
                                { word: mixinEntry!.value }
                            );
                        }
                    }
                });
                toRemove.forEach(decl => decl.remove());
                nextRule = node;
            } else if (node.type === 'atrule') {
                throw new Error('mixins @ rules are not supported yet!');
            }
        });
    }

    return rule;
}

export function createClassSubsetRoot(root: postcss.Root, selectorPrefix: string) {
    const mixinRoot = postcss.root();
    let addRootDecls = true;
    root.nodes!.forEach((node: SRule) => {
        if (node.type === 'rule') {
            if (node.selector.startsWith(selectorPrefix) && node.selector.indexOf(',') === -1) {
                if (addRootDecls && node.selectorType === 'class') {
                    addRootDecls = false;
                    node.walkDecls(decl => {
                        mixinRoot.append(decl.clone());
                    });
                } else {
                    // TODO: handle complex selectors with ,
                    const clone: SRule = node.clone({
                        selector: node.selector.replace(selectorPrefix, '&')
                    });
                    // TODO: maybe delete clone.selectorAst
                    mixinRoot.append(clone);
                }
            }
        }
    });
    return mixinRoot;
}

export function removeUnusedRules(
    ast: postcss.Root,
    meta: StylableMeta,
    _import: Imported,
    usedFiles: string[],
    resolvePath: (ctx: string, path: string) => string
): void {
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
                    const extend = symbol[valueMapping.extends];
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
    test: any = (statment: any) => statment.prop === valueMapping.extends
) {
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

export const reservedKeyFrames = [
    'none',
    'inherited',
    'initial',
    'unset',
    /* single-timing-function */
    'linear',
    'ease',
    'ease-in',
    'ease-in-out',
    'ease-out',
    'step-start',
    'step-end',
    'start',
    'end',
    /* single-animation-iteration-count */
    'infinite',
    /* single-animation-direction */
    'normal',
    'reverse',
    'alternate',
    'alternate-reverse',
    /* single-animation-fill-mode */
    'forwards',
    'backwards',
    'both',
    /* single-animation-play-state */
    'running',
    'paused'
];
