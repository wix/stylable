import { plugableRecord } from '../helpers/plugable-record';
import { createFeature } from './feature';
import * as STCustomSelector from './st-custom-selector';
import {
    transformCustomSelectorMap,
    transformCustomSelectors,
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

const dataKey =
    plugableRecord.key<
        Record<
            string,
            { selector: string; ast: SelectorList; isScoped: boolean; def: postcss.AtRule }
        >
    >('st-custom-selector');

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
        const inlined = transformCustomSelectorMap(customSelectors, (report) => {
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
        // Handle node resolve mapping for custom-selector.
        //      Currently custom selectors cannot get to this point in the process,
        //      due to them being replaced at the beginning of the transform process (prepareAST).
        //      However by using an internal process to analyze the context of selectors for
        //      the language service, a source selector can reach this point without the initial
        //      transform. This code keeps the custom selector untouched, but registers the AST it resolves to.
        // ToDo: in the future we want to move the custom selector transformation inline, or remove it all together.
        const customSelector =
            node.value.startsWith('--') &&
            STCustomSelector.getCustomSelectorExpended(context.meta, node.value.slice(2));
        if (customSelector) {
            const mappedSelectorAst = parseSelectorWithCache(customSelector, { clone: true });
            const mappedContext = selectorContext.createNestedContext(mappedSelectorAst);
            // ToDo: wrap in :is() to get intersection of selectors
            selectorContext.scopeSelectorAst(mappedContext);
            if (!mappedContext.inferredSelector.isEmpty()) {
                // ToDo: support multi selector with: "selectorContext.multiSelectorScope"
                selectorContext.setNextSelectorScope(mappedContext.inferredSelector, node); // doesn't add to the resolved elements
            }
        }
        return !!customSelector;
    },
});

// API

export function isScoped(meta: StylableMeta, name: string) {
    const analyzed = plugableRecord.getUnsafe(meta.data, dataKey);
    return analyzed[name]?.isScoped;
}

export function getCustomSelector(meta: StylableMeta, name: string): SelectorList | undefined {
    const analyzed = plugableRecord.getUnsafe(meta.data, dataKey);
    return analyzed[name]?.ast;
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
    const inlined = transformCustomSelectors(
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
