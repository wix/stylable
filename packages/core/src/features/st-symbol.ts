import { FeatureContext, createFeature } from './feature';
import type { VarSymbol, CSSVarSymbol, KeyframesSymbol } from './types';
import type { ImportSymbol } from './st-import';
import type { ClassSymbol } from './css-class';
import type { ElementSymbol } from './css-type';
import { plugableRecord } from '../helpers/plugable-record';
import { ignoreDeprecationWarn } from '../helpers/deprecation';
import type { StylableMeta } from '../stylable-meta';
import type * as postcss from 'postcss';

// SYMBOLS DEFINITION

// union of all of the symbols
export type StylableSymbol =
    | ImportSymbol
    | VarSymbol
    | ClassSymbol
    | ElementSymbol
    | CSSVarSymbol
    | KeyframesSymbol;
// the namespace that each symbol exists on
const NAMESPACES: Record<SymbolTypes, `main` | `keyframes`> = {
    import: `main`,
    class: `main`,
    cssVar: `main`,
    element: `main`,
    keyframes: `keyframes`,
    var: `main`,
};
// state structure
function createState(clone?: State): State {
    return {
        byNS: {
            main: clone ? [...clone.byNS.main] : [],
            keyframes: clone ? [...clone.byNS.keyframes] : [],
        },
        byNSFlat: {
            main: clone ? { ...clone.byNSFlat.main } : {},
            keyframes: clone ? { ...clone.byNSFlat.keyframes } : {},
        },
        byType: {
            import: clone ? { ...clone.byType.import } : {},
            class: clone ? { ...clone.byType.class } : {},
            cssVar: clone ? { ...clone.byType.cssVar } : {},
            element: clone ? { ...clone.byType.element } : {},
            keyframes: clone ? { ...clone.byType.keyframes } : {},
            var: clone ? { ...clone.byType.var } : {},
        },
    };
}

// internal types
type SymbolTypes = StylableSymbol['_kind'];
type Namespaces = typeof NAMESPACES;
interface SymbolDeclaration<K = Namespaces[SymbolTypes]> {
    name: string;
    symbol: Extract<
        StylableSymbol,
        {
            _kind: SymbolTypes extends any
                ? Namespaces[SymbolTypes] extends K
                    ? SymbolTypes
                    : any
                : any;
        }
    >;
    ast: postcss.Node | undefined;
    safeRedeclare: boolean; // ToDo: change to action: `def` | `ref` | `final`?
}
interface State {
    byNS: {
        [K in Namespaces[SymbolTypes]]: SymbolDeclaration<K>[];
    };
    byNSFlat: {
        [K in Namespaces[SymbolTypes]]: Record<
            string,
            StylableSymbol // ToDo: filter only relevant types to ns
        >;
    };
    byType: {
        [K in SymbolTypes]: Record<string, Extract<StylableSymbol, { _kind: K }>>;
    };
}

const dataKey = plugableRecord.key<State>('mappedSymbols');

export const diagnostics = {
    REDECLARE_SYMBOL(name: string) {
        return `redeclare symbol "${name}"`;
    },
};

// HOOKS

export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, createState());
    },
});

// API

export function get<T extends SymbolTypes>(
    meta: StylableMeta,
    name: string,
    type?: T
): Extract<StylableSymbol, { _kind: T }> | undefined {
    const { byNSFlat, byType } = plugableRecord.getUnsafe(meta.data, dataKey);
    if (type) {
        return byType[type][name] as any; // ToDo: try improve types
    }
    const nsName = type ? NAMESPACES[type] : `main`;
    return byNSFlat[nsName][name] as any;
}

export function getAll(
    meta: StylableMeta,
    ns: Namespaces[SymbolTypes] = `main`
): Record<string, StylableSymbol> {
    const { byNSFlat } = plugableRecord.getUnsafe(meta.data, dataKey);
    return byNSFlat[ns];
}

export function getAllByType<T extends SymbolTypes>(
    meta: StylableMeta,
    type: T
): State['byType'][T] {
    const { byType } = plugableRecord.getUnsafe(meta.data, dataKey);
    return byType[type];
}

export function addSymbol({
    context,
    symbol,
    node,
    safeRedeclare = false,
    localName,
}: {
    context: FeatureContext;
    symbol: StylableSymbol;
    node?: postcss.Node;
    safeRedeclare?: boolean;
    localName?: string;
}) {
    const { byNS, byNSFlat, byType } = plugableRecord.getUnsafe(context.meta.data, dataKey);
    const name = localName || symbol.name;
    const typeTable = byType[symbol._kind];
    const nsName = NAMESPACES[symbol._kind];
    const existingSymbol = byNS[nsName].find(({ name: existingName }) => name === existingName);
    if (existingSymbol && node && !safeRedeclare) {
        context.diagnostics.warn(node, diagnostics.REDECLARE_SYMBOL(name), {
            word: name,
        });
    }
    byNS[nsName].push({ name, symbol, ast: node, safeRedeclare });
    byNSFlat[nsName][name] = symbol;
    typeTable[name] = symbol;
    // deprecated
    ignoreDeprecationWarn(() => {
        context.meta.mappedSymbols[name] = symbol;
    });
}

/* inheritSymbols/forceSetSymbol are used for creating a copy meta with mixin root */
export function inheritSymbols(originMeta: StylableMeta, targetMeta: StylableMeta) {
    const originData = plugableRecord.getUnsafe(originMeta.data, dataKey);
    plugableRecord.set(targetMeta.data, dataKey, createState(originData));
}
export function forceSetSymbol({
    meta,
    symbol,
    localName,
}: {
    meta: StylableMeta;
    symbol: StylableSymbol;
    localName?: string;
}) {
    const { byNS, byNSFlat, byType } = plugableRecord.getUnsafe(meta.data, dataKey);
    const name = localName || symbol.name;
    byNS.main.push({ name, symbol, safeRedeclare: false, ast: undefined });
    byNSFlat.main[name] = symbol;
    byType[symbol._kind][name] = symbol;
    // ToDo: maybe override type record according to symbol._kind
}
