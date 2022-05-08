import { createFeature } from './feature';
import { parseSelectorWithCache, scopeNestedSelector } from '../helpers/selector';
import type { ImmutablePseudoClass } from '@tokey/css-selector-parser';
import * as postcss from 'postcss';
import type { SRule } from '../deprecated/postcss-ast-extension';

export const diagnostics = {
    MISSING_SCOPING_PARAM() {
        return '"@st-scope" missing scoping selector parameter';
    },
};

// HOOKS

export const hooks = createFeature<{ IMMUTABLE_SELECTOR: ImmutablePseudoClass }>({
    analyzeAtRule({ context, atRule, analyzeRule }) {
        if (!isStScopeStatement(atRule)) {
            return;
        }
        if (!atRule.params) {
            context.diagnostics.warn(atRule, diagnostics.MISSING_SCOPING_PARAM());
        }
        analyzeRule(
            postcss.rule({
                selector: atRule.params,
                source: atRule.source,
            }),
            {
                isScoped: true,
            }
        );
        context.meta.scopes.push(atRule);
    },
    prepareAST({ node, toRemove }) {
        if (isStScopeStatement(node)) {
            flattenScope(node);
            toRemove.push(() => node.replaceWith(node.nodes || []));
        }
    },
});

// API

function isStScopeStatement(node: postcss.ChildNode): node is postcss.AtRule {
    return node.type === 'atrule' && node.name === 'st-scope';
}

function flattenScope(atRule: postcss.AtRule) {
    const scopeSelector = atRule.params;
    if (scopeSelector) {
        atRule.walkRules((rule) => {
            rule.selector = scopeNestedSelector(
                parseSelectorWithCache(scopeSelector),
                parseSelectorWithCache(rule.selector)
            ).selector;
            (rule as SRule).stScopeSelector = atRule.params;
        });
    }
}
