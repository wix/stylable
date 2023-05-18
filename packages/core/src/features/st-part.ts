import { createFeature } from './feature';
import { plugableRecord } from '../helpers/plugable-record';
import type { StylableMeta } from '../stylable-meta';
import type { ImmutableSelectorList, SelectorList } from '@tokey/css-selector-parser';
import type { ClassSymbol } from './css-class';

export const diagnostics = {};

export interface PartData {
    mapTo: ImmutableSelectorList | ClassSymbol;
}
export interface HasParts {
    '-st-parts': Record<string, PartData>;
}

const dataKey = plugableRecord.key<{
    // ToDo: change to mode = 'structure' | 'legacy' and add explanation to both modes
    autoClassToPartEnabled: boolean;
    legacyParts: Record<string, PartData>;
}>('part');

// HOOKS

export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, { autoClassToPartEnabled: true, legacyParts: {} });
    },
});

// API

export function isStructureMode(meta: StylableMeta) {
    const data = plugableRecord.getUnsafe(meta.data, dataKey);
    return !data.autoClassToPartEnabled;
}
export function disableAutoClassToPart(meta: StylableMeta) {
    const data = plugableRecord.getUnsafe(meta.data, dataKey);
    data.autoClassToPartEnabled = false;
}
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
// ToDo: change to getLegacyPart / getLegacyPartNames or unify with structure getters
export function getPart(meta: StylableMeta, name: string): PartData | undefined {
    const { autoClassToPartEnabled, legacyParts } = plugableRecord.getUnsafe(meta.data, dataKey);
    return autoClassToPartEnabled ? legacyParts[name] : undefined;
}

export function getPartNames(meta: StylableMeta) {
    const { autoClassToPartEnabled, legacyParts } = plugableRecord.getUnsafe(meta.data, dataKey);
    return autoClassToPartEnabled ? Object.keys(legacyParts) : [];
}
export function getStructurePart(symbol: HasParts, name: string): PartData | undefined {
    return symbol['-st-parts']?.[name];
}
export function getStructureParts(symbol: HasParts) {
    return symbol['-st-parts'];
}
