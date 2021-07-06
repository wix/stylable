import { isAbsolute } from 'path';
import type * as postcss from 'postcss';
import { replaceRuleSelector } from './replace-rule-selector';
import type { Diagnostics } from './diagnostics';
import type { Imported, StylableMeta, StylableSymbol } from './stylable-processor';
import { isChildOfAtRule } from './helpers/rule';
import { scopeNestedSelector, parseSelectorWithCache } from './helpers/selector';
import type { ImportSymbol } from './stylable-meta';
import { valueMapping, mixinDeclRegExp } from './stylable-value-parsers';
import type { StylableResolver } from './stylable-resolver';

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

export function transformMatchesOnRule(rule: postcss.Rule, lineBreak: boolean) {
    return replaceRuleSelector(rule, { lineBreak });
}

export function mergeRules(mixinAst: postcss.Root, rule: postcss.Rule) {
    let mixinRoot: postcss.Rule | null | 'NoRoot' = null;
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
        let mixinEntry: postcss.Declaration | null = null;

        rule.walkDecls(mixinDeclRegExp, (decl) => {
            mixinEntry = decl;
        });
        if (!mixinEntry) {
            throw rule.error('missing mixin entry');
        }
        // TODO: handle rules before and after decl on entry
        mixinAst.nodes.slice().forEach((node) => {
            if (node === mixinRoot) {
                node.walkDecls((node) => {
                    rule.insertBefore(mixinEntry!, node);
                });
            } else if (node.type === 'decl') {
                rule.insertBefore(mixinEntry!, node);
            } else if (node.type === 'rule' || node.type === 'atrule') {
                if (rule.parent!.last === nextRule) {
                    rule.parent!.append(node);
                } else {
                    rule.parent!.insertAfter(nextRule, node);
                }
                nextRule = node;
            }
        });
    }

    return rule;
}

export function findDeclaration(importNode: Imported, test: any) {
    const fromIndex = importNode.rule.nodes.findIndex(test);
    return importNode.rule.nodes[fromIndex] as postcss.Declaration;
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
        if (!symbol[valueMapping.extends]) {
            return symbol.alias;
        }
    }

    return undefined;
}

export function generateScopedCSSVar(namespace: string, varName: string) {
    return `--${namespace}-${varName}`;
}

export function isCSSVarProp(value: string) {
    return value.startsWith('--');
}

export function scopeCSSVar(resolver: StylableResolver, meta: StylableMeta, symbolName: string) {
    const importedVar = resolver.deepResolve(meta.mappedSymbols[symbolName]);
    if (
        importedVar &&
        importedVar._kind === 'css' &&
        importedVar.symbol &&
        importedVar.symbol._kind === 'cssVar'
    ) {
        return importedVar.symbol.global
            ? importedVar.symbol.name
            : generateScopedCSSVar(importedVar.meta.namespace, importedVar.symbol.name.slice(2));
    }
    const cssVar = meta.cssVars[symbolName];
    if (cssVar?.global) {
        return symbolName;
    } else {
        return generateScopedCSSVar(meta.namespace, symbolName.slice(2));
    }
}

export function isValidClassName(className: string) {
    const test = /^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/g; // checks valid classname
    return !!className.match(test);
}
