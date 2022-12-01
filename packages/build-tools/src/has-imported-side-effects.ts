import type { Imported, Stylable, StylableMeta } from '@stylable/core';
import { STSymbol, STGlobal, CSSCustomProperty } from '@stylable/core/dist/index-internal';

/*
    return a set of deep imports with side-effects
    - skip over sheets with no side-effects
    - search for deep only in case a shallow import has no side-effect
*/
export function collectSheetsWithSideEffects(stylable: Stylable, meta: StylableMeta) {
    const absolutePathImports = getImportsWithSideEffects(stylable, meta);
    return new Set(absolutePathImports);
}

/**
 * return a list of paths to sheets that have side effects from meta (deep)
 */
function getImportsWithSideEffects(stylable: Stylable, meta: StylableMeta) {
    const imports: string[] = [];
    for (const importData of meta.getImportStatements()) {
        // attempt to resolve the request through stylable resolveModule,
        // is case of an error fall back to the original request
        let resolvedImportPath = importData.request;
        try {
            resolvedImportPath = stylable.resolver.resolvePath(
                importData.context,
                importData.request
            );
        } catch (e) {
            // fallback to request // TODO: check if this is correct
        }
        if (resolvedImportPath.endsWith('.css')) {
            // We want to include Stylable and native css files
            // that have effects on other files
            if (!resolvedImportPath.endsWith('.st.css')) {
                imports.push(resolvedImportPath);
            } else if (hasImportedSideEffects(stylable, meta, importData)) {
                // direct side effects required by importing context
                imports.push(resolvedImportPath);
            } else {
                const importMeta = stylable.analyze(resolvedImportPath);
                // check for global side-effects
                if (hasGlobalSideEffects(importMeta)) {
                    imports.push(resolvedImportPath);
                } else {
                    // collect deep side-effects
                    imports.push(...getImportsWithSideEffects(stylable, importMeta));
                }
            }
        }
    }
    return imports;
}

/*
 * return true if sheet contains a global definition that might effect runtime
 */
function hasGlobalSideEffects(meta: StylableMeta) {
    const globalRules = STGlobal.getGlobalRules(meta);
    if (globalRules.length) {
        return true;
    }
    for (const { global } of Object.values(STSymbol.getAllByType(meta, 'keyframes'))) {
        if (global) {
            return true;
        }
    }
    for (const { global } of Object.values(STSymbol.getAllByType(meta, 'layer'))) {
        if (global) {
            return true;
        }
    }
    for (const { global } of Object.values(STSymbol.getAllByType(meta, 'cssVar'))) {
        if (global) {
            return true;
        }
    }
    // ToDo: check for global insertions by mixins
    return false;
}

/**
 * return true if import has direct side effect on the importing context
 */
export function hasImportedSideEffects(stylable: Stylable, meta: StylableMeta, imported: Imported) {
    // direct import usage
    const { keyframes, layer } = imported.typed;
    if (keyframes && Object.keys(keyframes).length) {
        return true;
    }
    if (layer && Object.keys(layer).length) {
        return true;
    }

    const m = stylable.resolver.getModule(imported);
    if (m.kind === 'css' && m.value) {
        const runtimeDefs = CSSCustomProperty.getRuntimeTypedDefinitionNames(m.value);
        for (const propSymbol of Object.values(STSymbol.getAllByType(meta, 'cssVar'))) {
            if (
                propSymbol.alias?.import === imported &&
                runtimeDefs.includes(propSymbol.alias.name)
            ) {
                return true;
            }
        }
    }

    //compose usage // ToDo: run once outside
    for (const localSymbol of Object.values(meta.getAllClasses())) {
        if (
            localSymbol['-st-extends'] &&
            localSymbol['-st-extends']._kind === 'import' &&
            localSymbol['-st-extends'].import.request === imported.request
        ) {
            const cssResolved = stylable.resolver.resolveSymbolOrigin(
                localSymbol['-st-extends'],
                meta
            );
            if (
                cssResolved?.symbol &&
                cssResolved.symbol._kind === 'class' &&
                cssResolved.meta.root !== cssResolved.symbol.name
            ) {
                return true;
            }
        }
    }

    return false;
}
