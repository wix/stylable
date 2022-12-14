import type { Stylable, StylableMeta } from '@stylable/core';
import {
    processUrlDependencies,
    collectImportsWithSideEffects,
    hasImportedSideEffects,
} from '@stylable/build-tools';
import { LOADER_NAME } from './plugin-utils';
import { isAbsolute, join } from 'path';

export function getReplacementToken(token: string) {
    return `/* INJECT */ {__${token}__:true}`;
}

export function normalizeRelative(p: string) {
    p = p.replace(/\\/g, '/');
    return p.startsWith('.') ? p : './' + p;
}

export function getImports(
    stylable: Stylable,
    meta: StylableMeta,
    projectRoot: string,
    assetFilter: (url: string, context: string) => boolean,
    assetsMode: 'url' | 'loader',
    includeGlobalSideEffects: boolean
) {
    const urls = processUrlDependencies({
        meta,
        rootContext: projectRoot,
        filter: assetFilter,
        host: {
            isAbsolute,
            join,
        },
    });
    const imports: string[] = [];
    const unusedImports: string[] = [];

    if (includeGlobalSideEffects) {
        // new mode that collect deep side effects
        collectImportsWithSideEffects(stylable, meta, (contextMeta, absPath, isUsed) => {
            if (isUsed) {
                if (!absPath.endsWith('.st.css')) {
                    imports.push(`import ${JSON.stringify(`!!${LOADER_NAME}!` + absPath)};`);
                } else {
                    imports.push(`import ${JSON.stringify(absPath)};`);
                }
            } else if (contextMeta === meta) {
                unusedImports.push(absPath);
            }
        });
    } else {
        // legacy mode - only shallow imported side-effects
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
                    imports.push(`import ${JSON.stringify(resolved)};`);
                } else {
                    unusedImports.push(resolved);
                }
            }
        }
    }

    /**
     * Get the transformed css depth
     */
    const cssDepth = meta.transformCssDepth?.cssDepth ?? 0;
    /**
     * Take all deep dependencies since they can affect the output
     */
    const buildDependencies: string[] = Array.from(meta.transformCssDepth?.deepDependencies ?? []);

    /**
     * @remove
     * This part supports old loaders and should be removed
     */
    if (assetsMode === 'loader') {
        urls.forEach((assetPath) => imports.push(`import ${JSON.stringify(assetPath)};`));
    }

    return { urls, imports, buildDependencies, unusedImports, cssDepth };
}
