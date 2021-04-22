import {
    Imported,
    isAsset,
    makeAbsolute,
    processDeclarationUrls,
    Stylable,
    StylableMeta,
    visitMetaCSSDependenciesBFS,
} from '@stylable/core';
import { dirname } from 'path';

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
    const urls = handleUrlDependencies(meta, projectRoot);
    const imports: string[] = [];
    const unusedImports: string[] = [];
    for (const imported of meta.imports) {
        if (imported.request.endsWith('.st.css')) {
            /**
             * We want to include Stylable files that have effects on other files as regular imports
             * and other ones as unused for depth calculation
             */
            if (shouldBeIncludedAsImport(stylable, meta, imported)) {
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
        ({ source }) => {
            buildDependencies.push(source);
        },
        stylable.resolver
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

export function addBuildDependencies(
    loaderContext: { addDependency(dep: string): void },
    buildDependencies: string[]
) {
    for (const dep of buildDependencies) {
        loaderContext.addDependency(dep);
    }
}

function shouldBeIncludedAsImport(stylable: Stylable, meta: StylableMeta, imported: Imported) {
    //keyframes
    if (Object.keys(imported.keyframes).length) {
        return true;
    }

    //compose usage
    for (const localSymbol of Object.values(meta.classes)) {
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

function handleUrlDependencies(meta: StylableMeta, rootContext: string) {
    const moduleContext = dirname(meta.source);
    const urls: string[] = [];
    meta.outputAst!.walkDecls((node) =>
        processDeclarationUrls(
            node,
            (node) => {
                const { url } = node;
                if (url && isAsset(url)) {
                    node.url = `__stylable_url_asset_${urls.length}__`;
                    (node as any).stringType = '"';
                    urls.push(makeAbsolute(url, rootContext, moduleContext));
                }
            },
            true
        )
    );
    return urls;
}
