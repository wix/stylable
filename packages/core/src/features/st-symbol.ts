import { FeatureContext, createFeature } from './feature';
import type { ImportSymbol } from './st-import';
import type { VarSymbol } from './st-var';
import type { ClassSymbol } from './css-class';
import type { ElementSymbol } from './css-type';
import type { CSSVarSymbol } from './css-custom-property';
import type { KeyframesSymbol } from './css-keyframes';
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
const NAMESPACES = {
    import: `main`,
    class: `main`,
    cssVar: `main`,
    element: `main`,
    keyframes: `keyframes`,
    var: `main`,
} as const;
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
type filterSymbols<T extends SymbolTypes> = Extract<StylableSymbol, { _kind: T }>;
type SymbolMap = {
    [K in SymbolTypes]: filterSymbols<K>;
};
type SymbolTypeToNamespace = typeof NAMESPACES;
type FilterByNamespace<NS extends Namespaces, T extends SymbolTypes = SymbolTypes> = T extends any
    ? SymbolTypeToNamespace[T] extends NS
        ? T
        : never
    : never;
type NamespaceToSymbolType = {
    [NS in SymbolTypeToNamespace[SymbolTypes]]: FilterByNamespace<NS>;
};
type Namespaces = keyof NamespaceToSymbolType;
interface SymbolDeclaration<NS = Namespaces> {
    name: string;
    symbol: filterSymbols<
        SymbolTypes extends any ? (Namespaces extends NS ? SymbolTypes : any) : any
    >;
    ast: postcss.Node | undefined;
    safeRedeclare: boolean;
}
interface State {
    byNS: {
        [NS in Namespaces]: SymbolDeclaration<NS>[];
    };
    byNSFlat: {
        [NS in Namespaces]: Record<string, filterSymbols<NamespaceToSymbolType[NS]>>;
    };
    byType: {
        [T in keyof SymbolMap]: Record<string, SymbolMap[T]>;
    };
}

const dataKey = plugableRecord.key<State>('mappedSymbols');

export const diagnostics = {
    REDECLARE_SYMBOL(name: string) {
        return `redeclare symbol "${name}"`;
    },
    REDECLARE_ROOT() {
        return `root is used for the stylesheet and cannot be overridden`;
    },
};

// HOOKS

export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, createState());
    },
});

// API
export function get<T extends keyof SymbolMap>(meta: StylableMeta, name: string, type?: T) {
    const { byNSFlat, byType } = plugableRecord.getUnsafe(meta.data, dataKey);
    return (type ? byType[type][name] : byNSFlat['main'][name]) as filterSymbols<T> | undefined;
}

export function getAll<NS extends keyof NamespaceToSymbolType = `main`>(
    meta: StylableMeta,
    ns?: NS
) {
    const { byNSFlat } = plugableRecord.getUnsafe(meta.data, dataKey);
    return byNSFlat[ns || `main`] as State['byNSFlat'][NS];
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
    if (node && name === `root` && nsName === `main` && byNSFlat[nsName][name]) {
        context.diagnostics.warn(node, diagnostics.REDECLARE_ROOT(), { word: `root` });
        return;
    }
    byNS[nsName].push({ name, symbol, ast: node, safeRedeclare });
    byNSFlat[nsName][name] = symbol;
    typeTable[name] = symbol;
    // deprecated
    if (nsName === `main`) {
        ignoreDeprecationWarn(() => {
            context.meta.mappedSymbols[name] = symbol;
        });
    }
}

export function reportRedeclare(context: FeatureContext) {
    const { byNS } = plugableRecord.getUnsafe(context.meta.data, dataKey);
    for (const symbols of Object.values(byNS)) {
        const flat: Record<string, SymbolDeclaration[]> = {};
        const collisions: Set<string> = new Set();
        for (const symbolDecl of symbols) {
            const { name, safeRedeclare } = symbolDecl;
            flat[name] = flat[name] || [];
            if (!safeRedeclare && flat[name].length) {
                collisions.add(name);
            }
            flat[name].push(symbolDecl);
        }
        for (const name of collisions) {
            for (const { safeRedeclare, ast } of flat[name]) {
                if (!safeRedeclare && ast) {
                    context.diagnostics.warn(ast, diagnostics.REDECLARE_SYMBOL(name), {
                        word: name,
                    });
                }
            }
        }
    }
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
    symbol: filterSymbols<NamespaceToSymbolType['main']>;
    localName?: string;
}) {
    const { byNS, byNSFlat, byType } = plugableRecord.getUnsafe(meta.data, dataKey);
    const name = localName || symbol.name;
    byNS.main.push({ name, symbol, safeRedeclare: false, ast: undefined });
    byNSFlat.main[name] = symbol;
    byType[symbol._kind][name] = symbol;
}
