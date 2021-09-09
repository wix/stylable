import type { UrlNode } from 'css-selector-tokenizer';
import { isAsset, makeAbsolute, processDeclarationFunctions, StylableMeta } from '@stylable/core';
import { dirname } from 'path';

function defaultFilter() {
    return true;
}

export function processUrlDependencies(
    meta: StylableMeta,
    rootContext: string,
    filter: (url: string, context: string) => boolean = defaultFilter
) {
    const importerDir = dirname(meta.source);
    const urls: string[] = [];
    const onUrl = (node: UrlNode) => {
        const { url } = node;
        if (url && isAsset(url) && filter(url, importerDir)) {
            node.stringType = '"';
            delete node.innerSpacingBefore;
            delete node.innerSpacingAfter;
            node.url = `__stylable_url_asset_${urls.length}__`;
            urls.push(makeAbsolute(url, rootContext, importerDir));
        }
    };

    meta.outputAst!.walkDecls((node) => {
        processDeclarationFunctions(
            node,
            (functionNode) => {
                if (functionNode.type === 'url') {
                    onUrl(functionNode);
                }
            },
            true
        );
    });
    return urls;
}
