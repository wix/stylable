import { plugableRecord } from '../helpers/plugable-record';
import { createFeature } from './feature';
import * as STPart from './st-part';
import * as CSSClass from './css-class';
import { warnOnce } from '../helpers/deprecation';
import type postcss from 'postcss';
import { BaseAstNode, parseCSSValue } from '@tokey/css-value-parser';
import { parseSelectorWithCache } from '../helpers/selector';
import { ImmutableSelectorList, stringifySelectorAst } from '@tokey/css-selector-parser';
import { createDiagnosticReporter } from '../diagnostics';

export const diagnostics = {
    GLOBAL_MAPPING_LIMITATION: createDiagnosticReporter(
        '21000',
        'error',
        () => `Currently class mapping is limited to single global selector: :global(<selector>)`
    ),
    INVALID_MAPPING: createDiagnosticReporter(
        '21001',
        'error',
        () =>
            'class mapping expects a single selector within a global pseudo-class `=> :global(<selector>)`'
    ),
};
export const experimentalMsg = '[experimental feature] stylable structure (@st): API might change!';

const dataKey = plugableRecord.key<{}>('st-structure');

// HOOKS

export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, {});
    },
    analyzeAtRule({ context, atRule }) {
        if (!isStAtRule(atRule)) {
            return;
        }

        warnOnce(experimentalMsg);
        STPart.disableAutoClassToPart(context.meta);

        const analyzed = analyzeStAtRule(atRule);
        if (!analyzed) {
            return;
        }
        if (analyzed.type === 'topLevelClass') {
            // ToDo: error when nested (only top level for now)
            // ToDo: pass atuRule for diagnostics
            CSSClass.addClass(context, analyzed.name /*, atRule*/);
            // class mapping
            if (analyzed.mappedSelectors) {
                const selectors = analyzed.mappedSelectors;
                const firstSelectorNodes = selectors[0]?.nodes;
                if (
                    selectors.length !== 1 ||
                    firstSelectorNodes.length === 0 ||
                    firstSelectorNodes.length > 1
                ) {
                    context.diagnostics.report(diagnostics.INVALID_MAPPING(), {
                        node: atRule,
                    });
                } else if (
                    firstSelectorNodes[0].type !== 'pseudo_class' ||
                    firstSelectorNodes[0].value !== 'global' ||
                    firstSelectorNodes[0].nodes?.length !== 1
                ) {
                    // ToDo: support non global mapping
                    context.diagnostics.report(diagnostics.GLOBAL_MAPPING_LIMITATION(), {
                        node: atRule,
                        word: stringifySelectorAst(firstSelectorNodes[0]),
                    });
                } else {
                    CSSClass.extendTypedRule(
                        context,
                        atRule,
                        analyzed.name,
                        '-st-global',
                        firstSelectorNodes[0].nodes[0].nodes
                    );
                }
            }
        }
    },
});

// API

function isStAtRule(node: postcss.AnyNode): node is postcss.AtRule {
    return node?.type === 'atrule' && node.name === 'st';
}
type AnalyzedStDef =
    | undefined
    | { type: 'topLevelClass'; name: string; mappedSelectors?: ImmutableSelectorList };
function analyzeStAtRule(atRule: postcss.AtRule) {
    const params = parseCSSValue(atRule.params);

    // collect class definition
    if (params.length < 2) {
        // ToDo: report expected signature diagnostic
        return;
    }
    for (let i = 0; i < params.length; ++i) {
        const node = params[i];
        if (node.type === 'space' || node.type === 'comment') {
            continue;
        }
        if (node.type === 'literal' && node.value === '.') {
            // class
            const result: AnalyzedStDef = { type: 'topLevelClass', name: '' };
            const nextToken = params[++i];
            if (nextToken?.type !== '<custom-ident>' && nextToken.type !== '<dashed-ident>') {
                // ToDo: expected class name diagnostic
                return result;
            } else {
                result.name = nextToken.value;
            }
            //
            const mappedSelectors = analyzeMappedSelector(atRule.params, params, i);
            if (mappedSelectors) {
                result.mappedSelectors = mappedSelectors;
            }
            return result;
        }
    }
    return;
}

function analyzeMappedSelector(valueSrc: string, value: BaseAstNode[], startIndex: number) {
    let index = startIndex;
    while (index < value.length - 1) {
        const node = value[index];
        if (node.type === 'literal' && node.value === '=') {
            const nextNode = value[index + 1];
            if (nextNode.type === 'literal' && nextNode.value === '>') {
                return parseSelectorWithCache(valueSrc.slice(nextNode.end));
            }
        }
        index++;
    }
    return false;
}
