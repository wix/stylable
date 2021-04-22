import { isAsset, makeAbsolute, processDeclarationUrls, StylableMeta } from '@stylable/core';
import { UrlNode } from 'css-selector-tokenizer';
import { dirname } from 'path';

export function processUrlDependencies(meta: StylableMeta, rootContext: string) {
    const importerDir = dirname(meta.source);
    const urls: string[] = [];
    const onUrl = (node: UrlNode) => {
        const { url } = node;
        if (url && isAsset(url)) {
            node.stringType = '"';
            delete node.innerSpacingBefore;
            delete node.innerSpacingAfter;
            node.url = `__stylable_url_asset_${urls.length}__`;
            urls.push(makeAbsolute(url, rootContext, importerDir));
        }
    };
    meta.outputAst!.walkDecls((node) => processDeclarationUrls(node, onUrl, true));
    return urls;
}
