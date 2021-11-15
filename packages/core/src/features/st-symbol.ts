import { createFeature } from './feature';
import type { ImportSymbol, VarSymbol, CSSVarSymbol, KeyframesSymbol } from './types';
import type { ClassSymbol } from './css-class';
import type { ElementSymbol } from './css-type';
import { plugableRecord } from '../helpers/plugable-record';
import { ignoreDeprecationWarn } from '../helpers/deprecation';
import type { StylableMeta } from '../stylable-meta';
import type * as postcss from 'postcss';

export type StylableSymbol =
    | ImportSymbol
    | VarSymbol
    | ClassSymbol
    | ElementSymbol
    | CSSVarSymbol
    | KeyframesSymbol;

const dataKey = plugableRecord.key<Record<string, StylableSymbol>>();

export const diagnostics = {
    REDECLARE_SYMBOL(name: string) {
        return `redeclare symbol "${name}"`;
    },
};

// HOOKS

export const hooks = createFeature({
    analyzeInit({ data }) {
        plugableRecord.set(data, dataKey, {});
    },
});

// API

export function get(meta: StylableMeta, name: string): StylableSymbol | undefined {
    const state = plugableRecord.getUnsafe(meta.data, dataKey);
    return state[name];
}

export function getAll(meta: StylableMeta): Record<string, StylableSymbol> {
    return plugableRecord.getUnsafe(meta.data, dataKey);
}

export function addSymbol({
    meta,
    symbol,
    node,
    safeRedeclare = false,
    localName,
}: {
    meta: StylableMeta;
    symbol: StylableSymbol;
    node?: postcss.Node;
    safeRedeclare?: boolean;
    localName?: string;
}) {
    const stSymbolData = plugableRecord.getUnsafe(meta.data, dataKey);
    const name = localName || symbol.name;
    const existingSymbol = stSymbolData[name];
    if (existingSymbol && node && !safeRedeclare) {
        meta.diagnostics.warn(node, diagnostics.REDECLARE_SYMBOL(name), {
            word: name,
        });
    }
    stSymbolData[name] = symbol;
    // deprecated
    ignoreDeprecationWarn(() => {
        meta.mappedSymbols[name] = symbol;
    });
}

export function inheritSymbols(originMeta: StylableMeta, targetMeta: StylableMeta) {
    const originData = plugableRecord.getUnsafe(originMeta.data, dataKey);
    plugableRecord.set(targetMeta.data, dataKey, Object.create(originData));
}
