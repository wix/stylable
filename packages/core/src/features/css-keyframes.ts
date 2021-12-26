import { createFeature, FeatureContext } from './feature';
import * as STSymbol from './st-symbol';
import type { Imported } from './st-import';
import { plugableRecord } from '../helpers/plugable-record';
import { isChildOfAtRule } from '../helpers/rule';
import { paramMapping } from '../stylable-value-parsers';
import { globalValue } from '../utils';
import type * as postcss from 'postcss';

export interface KeyframesSymbol {
    _kind: 'keyframes';
    alias: string;
    name: string;
    import?: Imported;
    global?: boolean;
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
    'paused',
];

export const diagnostics = {
    REDECLARE_SYMBOL_KEYFRAMES(name: string) {
        return `redeclare keyframes symbol "${name}"`;
    },
    NO_KEYFRAMES_IN_ST_SCOPE() {
        return `cannot use "@keyframes" inside of "@st-scope"`;
    },
    MISSING_KEYFRAMES_NAME() {
        return '"@keyframes" missing parameter';
    },
    MISSING_KEYFRAMES_NAME_INSIDE_GLOBAL() {
        return `"@keyframes" missing parameter inside "${paramMapping.global}()"`;
    },
    KEYFRAME_NAME_RESERVED(name: string) {
        return `keyframes "${name}" is reserved`;
    },
};

const dataKey = plugableRecord.key<postcss.AtRule[]>('keyframes');

// HOOKS

export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, []);
    },
    analyzeAtRule({ context, atRule }) {
        let { params: name } = atRule;
        // fail when nested in `@st-scope`.
        if (isChildOfAtRule(atRule, `st-scope`)) {
            // ToDo: fix to allow nesting in `@media`
            context.diagnostics.error(atRule, diagnostics.NO_KEYFRAMES_IN_ST_SCOPE());
            return;
        }
        // save keyframes declarations
        const keyframesAsts = plugableRecord.getUnsafe(context.meta.data, dataKey);
        keyframesAsts.push(atRule);
        context.meta.keyframes.push(atRule); // deprecated
        // validate name
        if (!name) {
            context.diagnostics.warn(atRule, diagnostics.MISSING_KEYFRAMES_NAME());
            return;
        }
        //
        let global: boolean | undefined;
        const globalName = globalValue(name);
        if (globalName !== undefined) {
            name = globalName;
            global = true;
        }
        if (name === '') {
            context.diagnostics.warn(atRule, diagnostics.MISSING_KEYFRAMES_NAME_INSIDE_GLOBAL());
        }
        if (reservedKeyFrames.includes(name)) {
            context.diagnostics.error(atRule, diagnostics.KEYFRAME_NAME_RESERVED(name), {
                word: name,
            });
        }
        checkRedeclareKeyframes(context, name, atRule);
        STSymbol.addSymbol({
            context,
            node: atRule,
            symbol: {
                _kind: 'keyframes',
                alias: name,
                name,
                global,
            },
            safeRedeclare: true,
        });
        // deprecated
        context.meta.mappedKeyframes[name] = STSymbol.get(context.meta, name, `keyframes`)!;
    },
});

function checkRedeclareKeyframes(context: FeatureContext, symbolName: string, node: postcss.Node) {
    const symbol = context.meta.mappedKeyframes[symbolName];
    if (symbol) {
        context.diagnostics.warn(node, diagnostics.REDECLARE_SYMBOL_KEYFRAMES(symbolName), {
            word: symbolName,
        });
    }
    return symbol;
}
