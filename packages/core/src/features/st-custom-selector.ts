import { plugableRecord } from '../helpers/plugable-record';
import { createFeature } from './feature';
import {
    transformInlineCustomSelectorMap,
    transformInlineCustomSelectors,
    CustomSelectorMap,
} from '../helpers/custom-selector';
import { parseSelectorWithCache } from '../helpers/selector';
import * as postcss from 'postcss';
import { SelectorList, stringifySelectorAst } from '@tokey/css-selector-parser';
import type { StylableMeta } from '../stylable-meta';
import { createDiagnosticReporter, Diagnostics } from '../diagnostics';

export const diagnostics = {
    UNKNOWN_CUSTOM_SELECTOR: createDiagnosticReporter(
        '18001',
        'error',
        (selector: string) => `The selector '${selector}' is undefined`
    ),
};

interface AnalyzedCustomSelector {
    selector: string;
    ast: SelectorList;
    isScoped: boolean;
    def: postcss.AtRule;
}

const dataKey = plugableRecord.key<Record<string, AnalyzedCustomSelector>>('st-custom-selector');

export const CUSTOM_SELECTOR_RE = /:--[\w-]+/g;

// HOOKS

export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, {});
    },
    analyzeAtRule({ context, atRule, analyzeRule }) {
        const params = atRule.params.split(/\s/);
        const customSelector = params.shift();
        if (customSelector && customSelector.match(CUSTOM_SELECTOR_RE)) {
            const selector = atRule.params.replace(customSelector, '').trim();
            const ast = parseSelectorWithCache(selector, { clone: true });
            const isScoped = analyzeRule(postcss.rule({ selector, source: atRule.source }), {
                isScoped: false,
                originalNode: atRule,
            });
            const analyzed = plugableRecord.getUnsafe(context.meta.data, dataKey);
            const name = customSelector.slice(3);
            analyzed[name] = { selector, ast, isScoped, def: atRule };
        } else {
            // TODO: add warn there are two types one is not valid name and the other is empty name.
        }
    },
    analyzeDone(context) {
        const analyzed = plugableRecord.getUnsafe(context.meta.data, dataKey);
        const customSelectors: CustomSelectorMap = {};
        for (const [name, data] of Object.entries(analyzed)) {
            customSelectors[name] = data.ast;
        }
        const inlined = transformInlineCustomSelectorMap(customSelectors, (report) => {
            if (report.type === 'unknown' && analyzed[report.origin]) {
                const unknownSelector = `:--${report.unknown}`;
                context.diagnostics.report(diagnostics.UNKNOWN_CUSTOM_SELECTOR(unknownSelector), {
                    node: analyzed[report.origin].def,
                    word: unknownSelector,
                });
            } else if (report.type === 'circular') {
                // ToDo: report error
            }
        });
        // cache inlined selector
        for (const [name, ast] of Object.entries(inlined)) {
            analyzed[name].ast = ast;
            analyzed[name].selector = stringifySelectorAst(ast);
        }
    },
    prepareAST({ context, node, toRemove }) {
        // called without experimentalSelectorInference
        // split selectors & remove definitions
        if (node.type === 'rule' && node.selector.match(CUSTOM_SELECTOR_RE)) {
            node.selector = transformCustomSelectorInline(context.meta, node.selector, {
                diagnostics: context.diagnostics,
                node,
            });
        } else if (node.type === 'atrule' && node.name === 'custom-selector') {
            toRemove.push(node);
        }
    },
    transformSelectorNode({ context, selectorContext, node }) {
        const customSelector =
            node.value.startsWith('--') &&
            getCustomSelectorExpended(context.meta, node.value.slice(2));
        if (customSelector) {
            const mappedSelectorAst = parseSelectorWithCache(customSelector, { clone: true });
            const mappedContext = selectorContext.createNestedContext(mappedSelectorAst);
            selectorContext.scopeSelectorAst(mappedContext);
            const inferredSelector = selectorContext.experimentalSelectorInference
                ? mappedContext.inferredMultipleSelectors
                : mappedContext.inferredSelector;
            selectorContext.setNextSelectorScope(inferredSelector, node); // doesn't add to the resolved elements
            if (selectorContext.transform) {
                selectorContext.transformIntoMultiSelector(node, mappedSelectorAst);
            }
        }
        return !!customSelector;
    },
    transformAtRuleNode({ atRule }) {
        if (atRule.name === 'custom-selector') {
            atRule.remove();
        }
    },
});

// API

export function isScoped(meta: StylableMeta, name: string) {
    const analyzed = plugableRecord.getUnsafe(meta.data, dataKey);
    return analyzed[name]?.isScoped;
}

export function getCustomSelector(meta: StylableMeta, name: string): SelectorList | undefined {
    return plugableRecord.getUnsafe(meta.data, dataKey)[name]?.ast;
}
export function getCustomSelectors(meta: StylableMeta) {
    const analyzed = plugableRecord.getUnsafe(meta.data, dataKey);
    return Object.entries(analyzed).reduce((acc, [name, { ast }]) => {
        acc[name] = ast;
        return acc;
    }, {} as Record<string, AnalyzedCustomSelector['ast']>);
}

export function getCustomSelectorExpended(meta: StylableMeta, name: string): string | undefined {
    const analyzed = plugableRecord.getUnsafe(meta.data, dataKey);
    return analyzed[name]?.selector;
}

export function getCustomSelectorNames(meta: StylableMeta): string[] {
    const analyzed = plugableRecord.getUnsafe(meta.data, dataKey);
    return Object.keys(analyzed).map((name) => `:--${name}`);
}

export function transformCustomSelectorInline(
    meta: StylableMeta,
    selector: string,
    options: { diagnostics?: Diagnostics; node?: postcss.Node } = {}
) {
    const ast = parseSelectorWithCache(selector, { clone: true });
    const analyzed = plugableRecord.getUnsafe(meta.data, dataKey);
    const inlined = transformInlineCustomSelectors(
        ast,
        (name) => analyzed[name]?.ast,
        (report) => {
            if (options.diagnostics && options.node) {
                const unknownSelector = `:--${report.unknown}`;
                options.diagnostics.report(diagnostics.UNKNOWN_CUSTOM_SELECTOR(unknownSelector), {
                    node: options.node,
                    word: unknownSelector,
                });
            }
        }
    );
    return stringifySelectorAst(inlined);
}
