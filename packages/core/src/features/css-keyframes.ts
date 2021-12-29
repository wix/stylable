import { createFeature, FeatureContext } from './feature';
import * as STSymbol from './st-symbol';
import * as STImport from './st-import';
import type { Imported } from './st-import';
import type { StylableMeta } from '../stylable-meta';
import type { StylableResolver } from '../stylable-resolver';
import { plugableRecord } from '../helpers/plugable-record';
import { ignoreDeprecationWarn } from '../helpers/deprecation';
import { isInConditionalGroup } from '../helpers/rule';
import { namespace } from '../helpers/namespace';
import { escapeIdentifier } from '../helpers/escape';
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
    ILLEGAL_KEYFRAMES_NESTING() {
        return `illegal nested "@keyframes"`;
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
    UNKNOWN_IMPORTED_KEYFRAMES(name: string, path: string) {
        return `cannot resolve imported keyframes "${name}" from stylesheet "${path}"`;
    },
};

const dataKey = plugableRecord.key<{
    statements: postcss.AtRule[];
    paths: Record<string, string[]>;
    imports: string[];
}>('keyframes');

// HOOKS

STImport.ImportTypeHook.set(`keyframes`, (context, localName, importName, importDef) => {
    addKeyframes({
        context,
        name: localName,
        importName,
        ast: importDef.rule,
        importDef,
    });
});

export const hooks = createFeature<{
    RESOLVED: Record<string, KeyframesResolve>;
}>({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, { statements: [], paths: {}, imports: [] });
    },
    analyzeAtRule({ context, atRule }) {
        let { params: name } = atRule;
        // check nesting validity
        if (!isInConditionalGroup(atRule, true)) {
            context.diagnostics.error(atRule, diagnostics.ILLEGAL_KEYFRAMES_NESTING());
            return;
        }
        // save keyframes declarations
        const { statements: keyframesAsts } = plugableRecord.getUnsafe(context.meta.data, dataKey);
        keyframesAsts.push(atRule);
        // deprecated
        ignoreDeprecationWarn(() => context.meta.keyframes.push(atRule));
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
        addKeyframes({
            context,
            name,
            importName: name,
            ast: atRule,
            global,
        });
    },
    transformResolve({ context }) {
        const symbols = STSymbol.getAllByType(context.meta, `keyframes`);
        const resolved: Record<string, KeyframesResolve> = {};
        for (const [name, symbol] of Object.entries(symbols)) {
            const res = resolveKeyframes(context.meta, symbol, context.resolver);
            if (res) {
                resolved[name] = res;
            } else if (symbol.import) {
                context.diagnostics.error(
                    symbol.import.rule,
                    diagnostics.UNKNOWN_IMPORTED_KEYFRAMES(symbol.name, symbol.import.request),
                    {
                        word: symbol.name,
                    }
                );
            }
        }
        return resolved;
    },
    transformAtRuleNode({ context, atRule, resolved }) {
        const globalName = globalValue(atRule.params);
        const name = globalName ?? atRule.params;
        const resolve = resolved[name];
        /* js keyframes mixins won't have resolved keyframes */
        atRule.params = escapeIdentifier(
            resolve
                ? getTransformedName(resolve)
                : globalName ?? namespace(name, context.meta.namespace)
        );
    },
    transformDeclaration({ decl, resolved }) {
        const parsed = postcssValueParser(decl.value);
        // ToDo: improve by correctly parse & identify `animation-name`
        // ToDo: handle symbols from js mixin
        parsed.nodes.forEach((node) => {
            const resolve = resolved[node.value];
            const scoped = resolve && getTransformedName(resolve);
            if (scoped) {
                node.value = escapeIdentifier(scoped);
            }
        });
        decl.value = parsed.toString();
    },
    transformJSExports({ exports, resolved }) {
        for (const [name, resolve] of Object.entries(resolved)) {
            exports.keyframes[name] = escapeIdentifier(getTransformedName(resolve));
        }
    },
});

// API

export function getKeyframesStatements({ data }: StylableMeta): ReadonlyArray<postcss.AtRule> {
    const { statements } = plugableRecord.getUnsafe(data, dataKey);
    return statements;
}

export function get(meta: StylableMeta, name: string): KeyframesSymbol | undefined {
    return STSymbol.get(meta, name, `keyframes`);
}

export function getAll(meta: StylableMeta): Record<string, KeyframesSymbol> {
    return STSymbol.getAllByType(meta, `keyframes`);
}

function addKeyframes({
    context,
    name,
    importName,
    ast,
    global,
    importDef,
}: {
    context: FeatureContext;
    name: string;
    importName: string;
    ast: postcss.AtRule | postcss.Rule;
    global?: boolean;
    importDef?: Imported;
}) {
    const isFirstInPath = addKeyframesDeclaration(context.meta, name, ast, !!importDef);
    const safeRedeclare = isFirstInPath && !!STSymbol.get(context.meta, name, `keyframes`);
    // fields are confusing in this symbol:
    // name: the import name if imported OR the local name
    // alias: the local name
    STSymbol.addSymbol({
        context,
        node: ast,
        localName: name,
        symbol: {
            _kind: 'keyframes',
            alias: name,
            name: importName,
            global,
            import: importDef,
        },
        safeRedeclare,
    });
    // deprecated
    ignoreDeprecationWarn(() => {
        context.meta.mappedKeyframes[name] = STSymbol.get(context.meta, name, `keyframes`)!;
    });
}

function addKeyframesDeclaration(
    meta: StylableMeta,
    name: string,
    origin: postcss.AtRule | postcss.Rule,
    isImported: boolean
) {
    let path = ``;
    let current = origin.parent;
    while (current) {
        if (current.type === `rule`) {
            path += ` -> ` + (current as postcss.Rule).selector;
        } else if (current.type === `atrule`) {
            path +=
                ` -> ` +
                (current as postcss.AtRule).name +
                ` ` +
                (current as postcss.AtRule).params;
        }
        current = current.parent as any;
    }
    const { paths, imports } = plugableRecord.getUnsafe(meta.data, dataKey);
    if (!paths[path]) {
        paths[path] = [];
    }
    const isFirstInPath = !paths[path].includes(name);
    const isImportedBefore = imports.includes(name);
    paths[path].push(name);
    if (isImported) {
        imports.push(name);
    }
    return isFirstInPath && !isImportedBefore;
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
