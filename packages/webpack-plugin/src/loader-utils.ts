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

export function getImports(
    stylable: Stylable,
    meta: StylableMeta,
    projectRoot: string,
    assetsMode: 'url' | 'loader'
) {
    const urls = handleUrlDependencies(meta, projectRoot);
    const imports: string[] = [];
    const unUsedImports: string[] = [];
    for (const imported of meta.imports) {
        if (imported.fromRelative.endsWith('.st.css')) {
            if (shouldBeIncludedAsImport(stylable, meta, imported)) {
                imports.push(`import ${JSON.stringify(imported.fromRelative)};`);
            } else {
                unUsedImports.push(imported.fromRelative);
            }
        }
    }
    let cssDepth = 0;
    const buildDependencies: string[] = [];
    visitMetaCSSDependenciesBFS(
        meta,
        ({ source }, _, depth) => {
            buildDependencies.push(source);
            cssDepth = Math.max(cssDepth, depth);
        },
        stylable.resolver
    );

    if (assetsMode === 'loader') {
        urls.forEach((assetPath) => imports.push(`import ${JSON.stringify(assetPath)};`));
    }
    return { cssDepth, urls, imports, buildDependencies, unUsedImports };
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
            localSymbol['-st-extends'].import.fromRelative === imported.fromRelative
        ) {
            const cssResolved = stylable.resolver.resolveSymbolOrigin(
                localSymbol['-st-extends'],
                meta
            );
            if (cssResolved?.symbol && cssResolved.symbol._kind === 'class' && cssResolved.meta.root !== cssResolved.symbol.name) {
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
