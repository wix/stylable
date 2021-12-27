import { createFeature } from './feature';
import * as STSymbol from './st-symbol';
import type { Imported } from './st-import';
import type { StylableMeta } from '../stylable-meta';
import type { StylableResolver } from '../stylable-resolver';
import { plugableRecord } from '../helpers/plugable-record';
import { isChildOfAtRule } from '../helpers/rule';
import { namespace } from '../helpers/namespace';
import { paramMapping } from '../stylable-value-parsers';
import { globalValue } from '../utils';
import type * as postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';

export interface KeyframesSymbol {
    _kind: 'keyframes';
    alias: string;
    name: string;
    import?: Imported;
    global?: boolean;
}

export interface KeyframesResolve {
    meta: StylableMeta;
    symbol: KeyframesSymbol;
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

export const hooks = createFeature<{
    RESOLVED: Record<string, KeyframesResolve>;
}>({
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
        STSymbol.addSymbol({
            context,
            node: atRule,
            symbol: {
                _kind: 'keyframes',
                alias: name,
                name,
                global,
            },
        });
        // deprecated
        context.meta.mappedKeyframes[name] = STSymbol.get(context.meta, name, `keyframes`)!;
    },
    transformResolve({ context }) {
        const symbols = STSymbol.getAllByType(context.meta, `keyframes`);
        const resolved: Record<string, KeyframesResolve> = {};
        for (const [name, symbol] of Object.entries(symbols)) {
            const res = resolveKeyframes(context.meta, symbol, context.resolver);
            if (res) {
                resolved[name] = res;
            }
        }
        return resolved;
    },
    transformAtRuleNode({ context, atRule, resolved }) {
        const name = globalValue(atRule.params) ?? atRule.params;
        const resolve = resolved[name];
        /* js keyframes mixins won't have resolved keyframes */
        atRule.params = resolve
            ? getTransformedName(resolve)
            : namespace(name, context.meta.namespace);
    },
    transformDeclaration({ decl, resolved }) {
        const parsed = postcssValueParser(decl.value);
        // ToDo: improve by correctly parse & identify `animation-name`
        parsed.nodes.forEach((node) => {
            const resolve = resolved[node.value];
            const scoped = resolve && getTransformedName(resolve);
            if (scoped) {
                node.value = scoped;
            }
        });
        decl.value = parsed.toString();
    },
    transformJSExports({ exports, resolved }) {
        for (const [name, resolve] of Object.entries(resolved)) {
            exports.keyframes[name] = getTransformedName(resolve);
        }
    },
});

// API

export function getKeyframesStatements({ data }: StylableMeta): ReadonlyArray<postcss.AtRule> {
    const state = plugableRecord.getUnsafe(data, dataKey);
    return state;
}

export function get(meta: StylableMeta, name: string): KeyframesSymbol | undefined {
    return STSymbol.get(meta, name, `keyframes`);
}

function resolveKeyframes(meta: StylableMeta, symbol: KeyframesSymbol, resolver: StylableResolver) {
    let current = { meta, symbol };
    while (current.symbol?.import) {
        const res = resolver.resolveImported(
            current.symbol.import,
            current.symbol.name,
            'mappedKeyframes' // ToDo: refactor out of resolver
        );
        if (res?._kind === 'css' && res.symbol?._kind === 'keyframes') {
            const { meta, symbol } = res;
            current = {
                meta,
                symbol,
            };
        } else {
            return undefined;
        }
    }
    if (current.symbol) {
        return current;
    }
    return undefined;
}

function getTransformedName({ symbol, meta }: KeyframesResolve) {
    return symbol.global ? symbol.alias : namespace(symbol.alias, meta.namespace);
}
