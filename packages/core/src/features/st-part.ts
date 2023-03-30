import { createFeature } from './feature';
// import { createDiagnosticReporter } from '../diagnostics';
import { plugableRecord } from '../helpers/plugable-record';
import type { StylableMeta } from '../stylable-meta';
import type { SelectorList } from '@tokey/css-selector-parser';
import type { ClassSymbol } from './css-class';

export const diagnostics = {};

type PartData = {
    mapTo: SelectorList | ClassSymbol;
};
const dataKey = plugableRecord.key<{
    legacyParts: Record<string, PartData>;
}>('part');

// HOOKS

export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, { legacyParts: {} });
    },
});

// API

export function registerLegacyPart(
    meta: StylableMeta,
    name: string,
    options: { mapTo: SelectorList | ClassSymbol }
) {
    const { legacyParts } = plugableRecord.getUnsafe(meta.data, dataKey);
    const isCustomSelector = Array.isArray(options.mapTo);
    // register custom selector mapped parts over class
    if (!legacyParts[name] || (isCustomSelector && !Array.isArray(legacyParts[name].mapTo))) {
        legacyParts[name] = options;
    } else {
        // report?
    }
}
export function getPart(meta: StylableMeta, name: string): PartData | undefined {
    const { legacyParts } = plugableRecord.getUnsafe(meta.data, dataKey);
    return legacyParts[name];
}
