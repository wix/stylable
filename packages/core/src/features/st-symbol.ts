import { createFeature } from './feature';
import type { ImportSymbol, VarSymbol, CSSVarSymbol, KeyframesSymbol } from './types';
import type { ClassSymbol } from './css-class';
import type { ElementSymbol } from './css-type';
import { plugableRecord } from '../helpers/plugable-record';
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

export function getSymbol(meta: StylableMeta, name: string): StylableSymbol | undefined {
    const state = plugableRecord.getUnsafeAssure(meta.data, dataKey);
    return state[name] || /*deprecated*/ meta.mappedSymbols[name];
}

export function addSymbol({
    meta,
    symbol,
    node,
    safeRedeclare = false,
}: {
    meta: StylableMeta;
    symbol: StylableSymbol;
    node?: postcss.Node;
    safeRedeclare?: boolean;
}) {
    const stSymbolData = plugableRecord.getUnsafeAssure(meta.data, dataKey);
    const name = symbol.name;
    const existingSymbol = stSymbolData[name] || /*deprecated*/ meta.mappedSymbols[name];
    if (existingSymbol && node && !safeRedeclare) {
        meta.diagnostics.warn(node, diagnostics.REDECLARE_SYMBOL(name), {
            word: name,
        });
    }
    stSymbolData[name] = symbol;
    // deprecated
    meta.mappedSymbols[name] = symbol;
}
