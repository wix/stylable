import { createFeature, FeatureContext } from './feature';
import * as STSymbol from './st-symbol';
import * as STImport from './st-import';
import type { Imported } from './st-import';
import type { StylableMeta } from '../stylable-meta';
import { plugableRecord } from '../helpers/plugable-record';
import { isInConditionalGroup } from '../helpers/rule';
import { namespace } from '../helpers/namespace';
import { globalValue, GLOBAL_FUNC } from '../helpers/global';
import type * as postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import { createDiagnosticReporter } from '../diagnostics';

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
    ILLEGAL_KEYFRAMES_NESTING: createDiagnosticReporter(
        '02001',
        'error',
        () => `illegal nested "@keyframes"`
    ),
    MISSING_KEYFRAMES_NAME: createDiagnosticReporter(
        '02002',
        'error',
        () => '"@keyframes" missing parameter'
    ),
    MISSING_KEYFRAMES_NAME_INSIDE_GLOBAL: createDiagnosticReporter(
        '02003',
        'error',
        () => `"@keyframes" missing parameter inside "${GLOBAL_FUNC}()"`
    ),
    KEYFRAME_NAME_RESERVED: createDiagnosticReporter(
        '02004',
        'error',
        (name: string) => `keyframes "${name}" is reserved`
    ),
    UNKNOWN_IMPORTED_KEYFRAMES: createDiagnosticReporter(
        '02005',
        'error',
        (name: string, path: string) =>
            `cannot resolve imported keyframes "${name}" from stylesheet "${path}"`
    ),
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
            context.diagnostics.report(diagnostics.ILLEGAL_KEYFRAMES_NESTING(), { node: atRule });
            return;
        }
        // save keyframes declarations
        const { statements: keyframesAsts } = plugableRecord.getUnsafe(context.meta.data, dataKey);
        keyframesAsts.push(atRule);
        // validate name
        if (!name) {
            context.diagnostics.report(diagnostics.MISSING_KEYFRAMES_NAME(), { node: atRule });
            return;
        }
        //
        const isStylable = context.meta.type === 'stylable';
        let global: boolean | undefined;
        const globalName = isStylable ? globalValue(name) : undefined;
        if (globalName !== undefined) {
            name = globalName;
            global = true;
        }
        if (name === '') {
            context.diagnostics.report(diagnostics.MISSING_KEYFRAMES_NAME_INSIDE_GLOBAL(), {
                node: atRule,
            });
            return;
        }
        if (reservedKeyFrames.includes(name)) {
            context.diagnostics.report(diagnostics.KEYFRAME_NAME_RESERVED(name), {
                node: atRule,
                word: name,
            });
        }
        addKeyframes({
            context,
            name,
            importName: name,
            ast: atRule,
            global: isStylable ? global : true,
        });
    },
    transformResolve({ context }) {
        const symbols = STSymbol.getAllByType(context.meta, `keyframes`);
        const resolved: Record<string, KeyframesResolve> = {};
        const resolvedSymbols = context.getResolvedSymbols(context.meta);
        for (const [name, symbol] of Object.entries(symbols)) {
            const res = resolvedSymbols.keyframes[name];
            if (res) {
                resolved[name] = res;
            } else if (symbol.import) {
                context.diagnostics.report(
                    diagnostics.UNKNOWN_IMPORTED_KEYFRAMES(symbol.name, symbol.import.request),
                    {
                        node: symbol.import.rule,
                        word: symbol.name,
                    }
                );
            }
        }
        return resolved;
    },
    transformAtRuleNode({ context, atRule, resolved }) {
        const globalName =
            context.meta.type === 'stylable' ? globalValue(atRule.params) : undefined;
        const name = globalName ?? atRule.params;
        if (!name) {
            return;
        }
        const resolve = resolved[name];
        /* js keyframes mixins won't have resolved keyframes */
        atRule.params = resolve
            ? getTransformedName(resolve)
            : globalName ?? namespace(name, context.meta.namespace);
    },
    transformDeclaration({ decl, resolved }) {
        const parsed = postcssValueParser(decl.value);
        // ToDo: improve by correctly parse & identify `animation-name`
        // ToDo: handle symbols from js mixin
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
    /**
     * keyframes are safe to redeclare in case they are unique within their context (applied
     * in different times/cases), for example 2 keyframes statements can override each other
     * if 1 is applied on the root (always) and the other in @media (on some condition).
     *
     * > in case keyframes are imported, then no local keyframes
     * > are allowed to override them (will report a warning).
     */
    const isFirstInPath = addKeyframesDeclaration(context.meta, name, ast, !!importDef);
    // first must not be `safeRedeclare`
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

function getTransformedName({ symbol, meta }: KeyframesResolve) {
    return symbol.global ? symbol.alias : namespace(symbol.alias, meta.namespace);
}
