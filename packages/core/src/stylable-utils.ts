import { isAbsolute } from 'path';
import type * as postcss from 'postcss';
import { replaceRuleSelector } from './replace-rule-selector';
import type { Diagnostics } from './diagnostics';
import type { ImportSymbol, StylableSymbol } from './features';
import { isChildOfAtRule } from './helpers/rule';
import { scopeNestedSelector, parseSelectorWithCache } from './helpers/selector';

export const CUSTOM_SELECTOR_RE = /:--[\w-]+/g;

export function isValidDeclaration(decl: postcss.Declaration) {
    return typeof decl.value === 'string';
}

export function expandCustomSelectors(
    rule: postcss.Rule,
    customSelectors: Record<string, string>,
    diagnostics?: Diagnostics
): string {
    if (rule.selector.includes(':--')) {
        rule.selector = rule.selector.replace(
            CUSTOM_SELECTOR_RE,
            (extensionName, _matches, selector) => {
                if (!customSelectors[extensionName] && diagnostics) {
                    diagnostics.warn(rule, `The selector '${rule.selector}' is undefined`, {
                        word: rule.selector,
                    });
                    return selector;
                }
                // TODO: support nested CustomSelectors
                return ':matches(' + customSelectors[extensionName] + ')';
            }
        );

        return (rule.selector = transformMatchesOnRule(rule, false));
    }
    return rule.selector;
}

function transformMatchesOnRule(rule: postcss.Rule, lineBreak: boolean) {
    return replaceRuleSelector(rule, { lineBreak });
}

export const INVALID_MERGE_OF = (mergeValue: string) => {
    return `invalid merge of: \n"${mergeValue}"`;
};
// ToDo: move to helpers/mixin
export function mergeRules(
    mixinAst: postcss.Root,
    rule: postcss.Rule,
    mixinDecl: postcss.Declaration,
    report?: Diagnostics
) {
    let mixinRoot: postcss.Rule | null | 'NoRoot' = null;
    const nestedInKeyframes = isChildOfAtRule(rule, `keyframes`);
    mixinAst.walkRules((mixinRule: postcss.Rule) => {
        if (isChildOfAtRule(mixinRule, 'keyframes')) {
            return;
        }
        if (mixinRule.selector === '&' && !mixinRoot) {
            if (mixinRule.parent === mixinAst) {
                mixinRoot = mixinRule;
            } else {
                const { selector } = scopeNestedSelector(
                    parseSelectorWithCache(rule.selector),
                    parseSelectorWithCache(mixinRule.selector)
                );
                mixinRoot = 'NoRoot';
                mixinRule.selector = selector;
            }
        } else {
            const { selector } = scopeNestedSelector(
                parseSelectorWithCache(rule.selector),
                parseSelectorWithCache(mixinRule.selector)
            );
            mixinRule.selector = selector;
        }
    });

    if (mixinAst.nodes) {
        let nextRule: postcss.Rule | postcss.AtRule = rule;
        // TODO: handle rules before and after decl on entry
        mixinAst.nodes.slice().forEach((node) => {
            if (node === mixinRoot) {
                node.walkDecls((node) => {
                    rule.insertBefore(mixinDecl, node);
                });
            } else if (node.type === 'decl') {
                rule.insertBefore(mixinDecl, node);
            } else if (node.type === 'rule' || node.type === 'atrule') {
                const valid = !nestedInKeyframes;
                if (valid) {
                    if (rule.parent!.last === nextRule) {
                        rule.parent!.append(node);
                    } else {
                        rule.parent!.insertAfter(nextRule, node);
                    }
                    nextRule = node;
                } else {
                    report?.warn(rule, INVALID_MERGE_OF(node.toString()));
                }
            }
        });
    }

    return rule;
}

export function getSourcePath(root: postcss.Root, diagnostics: Diagnostics) {
    const source = (root.source && root.source.input.file) || '';
    if (!source) {
        diagnostics.error(root, 'missing source filename');
    } else if (!isAbsolute(source)) {
        throw new Error('source filename is not absolute path: "' + source + '"');
    }
    return source;
}

export function getAlias(symbol: StylableSymbol): ImportSymbol | undefined {
    if (symbol._kind === 'class' || symbol._kind === 'element') {
        if (!symbol[`-st-extends`]) {
            return symbol.alias;
        }
    }

    return undefined;
}
