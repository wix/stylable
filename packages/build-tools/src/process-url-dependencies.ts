import type { UrlNode } from 'css-selector-tokenizer';
import type { StylableMeta } from '@stylable/core';
import {
    isAsset,
    makeAbsolute,
    processDeclarationFunctions,
} from '@stylable/core/dist/index-internal';
import { dirname } from 'path';

function defaultFilter() {
    return true;
}

export function processUrlDependencies({
    meta,
    rootContext,
    filter = defaultFilter,
    getReplacement = ({ index }) => `__stylable_url_asset_${index}__`,
    host,
}: {
    meta: {
        source: StylableMeta['source'];
        targetAst?: StylableMeta['targetAst'];
    };
    rootContext: string;
    filter?: (url: string, context: string) => boolean;
    getReplacement?: (params: {
        urls: string[];
        url: string;
        rootContext: string;
        importerDir: string;
        absoluteRequest: string;
        index: number;
    }) => string;
    host: {
        join: (...paths: string[]) => string;
        isAbsolute: (path: string) => boolean;
    };
}) {
    const importerDir = dirname(meta.source);
    const urls: string[] = [];
    const onUrl = (node: UrlNode) => {
        const { url } = node;
        if (url && isAsset(url) && filter(url, importerDir)) {
            node.stringType = '"';
            delete node.innerSpacingBefore;
            delete node.innerSpacingAfter;
            const absoluteRequest = makeAbsolute(host, url, rootContext, importerDir);
            node.url = getReplacement({
                urls,
                url,
                rootContext,
                importerDir,
                absoluteRequest,
                index: urls.length,
            });
            urls.push(absoluteRequest);
        }
    };

    meta.targetAst!.walkDecls((node) => {
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
