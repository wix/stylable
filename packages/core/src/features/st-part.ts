import { createFeature } from './feature';
import { plugableRecord } from '../helpers/plugable-record';
import type { StylableMeta } from '../stylable-meta';
import type { ImmutableSelectorList, SelectorList } from '@tokey/css-selector-parser';
import type { ClassSymbol } from './css-class';
import type { MappedStates } from './st-custom-state';

export const diagnostics = {};

export interface PartSymbol extends HasParts {
    _kind: 'part';
    name: string;
    id: string;
    mapTo: ImmutableSelectorList | ClassSymbol;
    // ToDo: handle part with state; + extract to HasStates
    '-st-states'?: MappedStates;
}
export interface HasParts {
    '-st-parts': Record<string, PartSymbol>;
}

const dataKey = plugableRecord.key<{
    // ToDo: change to mode = 'structure' | 'legacy' and add explanation to both modes
    autoClassToPartEnabled: boolean;
    legacyParts: Record<string, PartSymbol>;
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
    { name, mapTo }: { name: string; mapTo: SelectorList | ClassSymbol }
) {
    const { legacyParts } = plugableRecord.getUnsafe(meta.data, dataKey);
    const isCustomSelector = Array.isArray(mapTo);
    // register custom selector mapped parts over class
    if (!legacyParts[name] || (isCustomSelector && !Array.isArray(legacyParts[name].mapTo))) {
        legacyParts[name] = createSymbol({ name, id: name, mapTo });
    } else {
        // report?
    }
}
export function createSymbol(
    input: Partial<PartSymbol> & Pick<PartSymbol, 'name' | 'id' | 'mapTo'>
): PartSymbol {
    const parts = input['-st-parts'] || {};
    return { ...input, _kind: 'part', '-st-parts': parts };
}
// ToDo: change to getLegacyPart / getLegacyPartNames or unify with structure getters
export function getPart(meta: StylableMeta, name: string): PartSymbol | undefined {
    const { autoClassToPartEnabled, legacyParts } = plugableRecord.getUnsafe(meta.data, dataKey);
    return autoClassToPartEnabled ? legacyParts[name] : undefined;
}

export function getPartNames(meta: StylableMeta) {
    const { autoClassToPartEnabled, legacyParts } = plugableRecord.getUnsafe(meta.data, dataKey);
    return autoClassToPartEnabled ? Object.keys(legacyParts) : [];
}
export function getStructurePart(symbol: HasParts, name: string): PartSymbol | undefined {
    return symbol['-st-parts']?.[name];
}
export function getStructureParts(symbol: HasParts) {
    return symbol['-st-parts'];
}
