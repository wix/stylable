import type { CodeMod } from './types';
import type { Log } from '../logger';

// Builtin codemods
import { stImportToAtImport } from './st-import-to-at-import';
import { stGlobalCustomPropertyToAtProperty } from './st-global-custom-property-to-at-property';
import { namespaceToStNamespace } from './namespace-to-st-namespace';

export const registeredMods: Map<string, CodeMod> = new Map([
    ['st-import-to-at-import', stImportToAtImport],
    ['st-global-custom-property-to-at-property', stGlobalCustomPropertyToAtProperty],
    ['namespace-to-st-namespace', namespaceToStNamespace],
]);

export function loadBuiltInCodemods(
    mods: string[],
    loadedMods: Set<{ id: string; apply: CodeMod }>,
    log: Log
) {
    for (const id of mods) {
        const apply = registeredMods.get(id);
        if (!apply) {
            log(`Unknown mod ${id}`);
        } else {
            loadedMods.add({ id, apply });
        }
    }
}

export function loadExternalCodemods(
    external: string[],
    rootDir: string,
    loadedMods: Set<{ id: string; apply: CodeMod }>,
    log: Log
) {
    for (const externalMod of external) {
        try {
            const resolved = require.resolve(externalMod, { paths: [rootDir] });
            const codemods = require(resolved).codemods as Iterable<{
                id: string;
                apply: CodeMod;
            }>;
            for (const mod of codemods) {
                if (typeof mod.id === 'string' && typeof mod.apply === 'function') {
                    log(`Loaded external codemod ${JSON.stringify(mod.id)}`);
                    loadedMods.add(mod);
                } else {
                    throw new Error(
                        `Invalid codemod entry. Codemods must contain a "id" string and "apply" function fields got ${Object.keys(
                            mod
                        )}`
                    );
                }
            }
        } catch (e) {
            log(`Failed to load external codemods from: ${externalMod}`);
            log(
                `Make sure you specify a package request and the resolved module has exports.codemods as iterable`
            );
            log(`${e instanceof Error ? e.stack : e}`);
        }
    }
}
