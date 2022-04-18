import { Stylable, StylableMeta, visitMetaCSSDependenciesBFS } from '@stylable/core';
import { processUrlDependencies, hasImportedSideEffects } from '@stylable/build-tools';

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
        if (imported.request.endsWith('.st.css')) {
            /**
             * We want to include Stylable files that have effects on other files as regular imports
             * and other ones as unused for depth calculation
             */
            if (hasImportedSideEffects(stylable, meta, imported)) {
                imports.push(`import ${JSON.stringify(imported.request)};`);
            } else {
                unusedImports.push(imported.request);
            }
        }
    }
    const buildDependencies: string[] = [];
    /**
     * Collect all deep dependencies since they can affect the output
     */
    visitMetaCSSDependenciesBFS(
        meta,
        ({ source }) => buildDependencies.push(source),
        stylable.resolver,
        (resolvedPath) => buildDependencies.push(resolvedPath)
    );

    /**
     * @remove
     * This part supports old loaders and should be removed
     */
    if (assetsMode === 'loader') {
        urls.forEach((assetPath) => imports.push(`import ${JSON.stringify(assetPath)};`));
    }

    return { urls, imports, buildDependencies, unusedImports };
}
