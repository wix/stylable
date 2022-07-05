import type { Stylable, StylableMeta } from '@stylable/core';

export function tryCollectImportsDeep(
    stylable: Stylable,
    meta: StylableMeta,
    imports = new Set<string>()
) {
    for (const { context, request } of meta.getImportStatements()) {
        try {
            const resolved = stylable.resolvePath(context, request);
            imports.add(resolved);
            tryCollectImportsDeep(stylable, stylable.analyze(resolved), imports);
        } catch (e) {
            /** */
        }
    }
    return imports;
}
