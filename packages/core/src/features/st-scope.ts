import { createFeature } from './feature';
import { parseSelectorWithCache, scopeNestedSelector } from '../helpers/selector';
import type { Stylable } from '../stylable';
import type { ImmutablePseudoClass } from '@tokey/css-selector-parser';
import * as postcss from 'postcss';
import type { SRule } from '../deprecated/postcss-ast-extension';
import { createDiagnosticReporter } from '../diagnostics';

export const diagnostics = {
    MISSING_SCOPING_PARAM: createDiagnosticReporter(
        '11009',
        'error',
        () => '"@st-scope" missing scoping selector parameter'
    ),
};

// HOOKS

export const hooks = createFeature<{ IMMUTABLE_SELECTOR: ImmutablePseudoClass }>({
    analyzeAtRule({ context, atRule, analyzeRule }) {
        if (!isStScopeStatement(atRule)) {
            return;
        }
        if (!atRule.params) {
            context.diagnostics.report(diagnostics.MISSING_SCOPING_PARAM(), { node: atRule });
        }
        analyzeRule(
            postcss.rule({
                selector: atRule.params,
                source: atRule.source,
            }),
            {
                isScoped: true,
                originalNode: atRule,
            }
        );
        context.meta.scopes.push(atRule);
    },
    prepareAST({ node, toRemove }) {
        // called without experimentalSelectorInference
        // flatten @st-scope before transformation
        if (isStScopeStatement(node)) {
            flattenScope(node);
            toRemove.push(() => node.replaceWith(node.nodes || []));
        }
    },
    transformAtRuleNode({ context: { meta }, atRule, transformer }) {
        if (isStScopeStatement(atRule)) {
            const { selector, inferredSelector } = transformer.scopeSelector(
                meta,
                atRule.params,
                atRule
            );
            // transform selector in params
            atRule.params = selector;
            // track selector context for nested selector nodes
            transformer.containerInferredSelectorMap.set(atRule, inferredSelector);
        }
    },
    transformLastPass({ ast }) {
        // called with experimentalSelectorInference=true
        // flatten @st-scope after transformation
        const toRemove = [];
        for (const node of ast.nodes) {
            if (isStScopeStatement(node)) {
                flattenScope(node);
                toRemove.push(() => node.replaceWith(node.nodes || []));
            }
        }
        toRemove.forEach((remove) => remove());
    },
});

// API

export class StylablePublicApi {
    constructor(private stylable: Stylable) {}
    public getStScope(rule: postcss.Rule) {
        return getStScope(rule);
    }
}

export function isStScopeStatement(node: any): node is postcss.AtRule {
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

function getStScope(rule: postcss.Rule): postcss.AtRule | undefined {
    let current: postcss.Container | postcss.Document = rule;
    while (current?.parent) {
        current = current.parent;
        if (isStScopeStatement(current) && current.parent?.type === 'root') {
            return current;
        }
    }
    return;
}
