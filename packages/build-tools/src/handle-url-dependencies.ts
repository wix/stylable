import { isAsset, makeAbsolute, processDeclarationUrls, StylableMeta } from '@stylable/core';
import { dirname } from 'path';

function rewriteUrl(node: any, replacementIndex: number) {
    node.stringType = '"';
    delete node.innerSpacingBefore;
    delete node.innerSpacingAfter;
    node.url = `__stylable_url_asset_${replacementIndex}__`;
}

export function getUrlDependencies(meta: StylableMeta, rootContext: string) {
    const importerDir = dirname(meta.source);
    const urls: string[] = [];
    meta.outputAst!.walkDecls((node) =>
        processDeclarationUrls(
            node,
            (node) => {
                const { url } = node;
                if (url && isAsset(url)) {
                    rewriteUrl(node, urls.length);
                    urls.push(makeAbsolute(url, rootContext, importerDir));
                }
            },
            true
        )
    );
    return urls;
}
