import type { Stylable, StylableMeta } from '@stylable/core';
import { tryCollectImportsDeep } from '@stylable/core/dist/index-internal';
import { processUrlDependencies, hasImportedSideEffects } from '@stylable/build-tools';
import { LOADER_NAME } from './plugin-utils';

export function getReplacementToken(token: string) {
    return `/* INJECT */ {__${token}__:true}`;
}

export function getImports(
    stylable: Stylable,
    meta: StylableMeta,
    projectRoot: string,
    assetFilter: (url: string, context: string) => boolean,
    assetsMode: 'url' | 'loader'
) {
    const urls = processUrlDependencies(meta, projectRoot, assetFilter);
    const imports: string[] = [];
    const unusedImports: string[] = [];

    for (const imported of meta.getImportStatements()) {
        // attempt to resolve the request through stylable resolveModule,
        // is case of an error fall back to the original request
        let resolved = imported.request;
        try {
            resolved = stylable.resolver.resolvePath(imported.context, imported.request);
        } catch (e) {
            // fallback to request
        }
        if (resolved.endsWith('.css')) {
            // We want to include Stylable and native css files that have effects on other files as regular imports
            // and other ones as unused for depth calculation
            if (!resolved.endsWith('.st.css')) {
                imports.push(`import ${JSON.stringify(`!!${LOADER_NAME}!` + resolved)};`);
                continue;
            }
            if (hasImportedSideEffects(stylable, meta, imported)) {
                imports.push(`import ${JSON.stringify(imported.request)};`);
            } else {
                unusedImports.push(imported.request);
            }
        }
    }
    /**
     * Collect all deep dependencies since they can affect the output
     */
    const buildDependencies: string[] = Array.from(tryCollectImportsDeep(stylable, meta));

    /**
     * @remove
     * This part supports old loaders and should be removed
     */
    if (assetsMode === 'loader') {
        urls.forEach((assetPath) => imports.push(`import ${JSON.stringify(assetPath)};`));
    }

    return { urls, imports, buildDependencies, unusedImports };
}
