import { plugableRecord } from '../helpers/plugable-record';
import { createFeature } from './feature';
import * as STPart from './st-part';
import * as CSSClass from './css-class';
import { warnOnce } from '../helpers/deprecation';
import type postcss from 'postcss';
import { parseCSSValue } from '@tokey/css-value-parser';

export const diagnostics = {
    // UNEXPECTED_DECL_VALUE: createDiagnosticReporter(
    //     '00000',
    //     'error',
    //     (value: string) => `unexpected value: ${value}`
    // ),
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
        if (analyzed.type === 'topLevelClass') {
            // ToDo: error when nested (only top level for now)
            // ToDo: pass atuRule for diagnostics
            CSSClass.addClass(context, analyzed.name /*, atRule*/);
        }
    },
});

// API

function isStAtRule(node: postcss.AnyNode): node is postcss.AtRule {
    return node?.type === 'atrule' && node.name === 'st';
}
type AnalyzedStDef =
    | { type: ''; name: string; errors: string[] }
    | { type: 'topLevelClass'; name: string; errors: string[] };
function analyzeStAtRule(atRule: postcss.AtRule) {
    const result: AnalyzedStDef = { type: '', errors: [] } as any;
    const params = parseCSSValue(atRule.params);

    // collect class definition
    if (params.length < 2) {
        // ToDo: report expected signature diagnostic
        return result;
    }
    for (let i = 0; i < params.length; ++i) {
        const node = params[i];
        if (node.type === 'space' || node.type === 'comment') {
            continue;
        }
        if (node.type === 'literal' && node.value === '.') {
            // class
            result.type = 'topLevelClass';
            const nextToken = params[++i];
            if (nextToken?.type !== '<custom-ident>' && nextToken.type !== '<dashed-ident>') {
                // ToDo: expected class name diagnostic
                return result;
            } else {
                result.name = nextToken.value;
            }
        }
    }
    return result;
}
