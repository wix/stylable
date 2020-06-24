import path from 'path';
import postcss from 'postcss';
import isUrl from 'is-url-superb';
import { ParsedValue } from './types';

const { parseValues, stringifyValues } = require('css-selector-tokenizer');

export type OnUrlCallback = (node: ParsedValue) => void;

export function collectAssets(ast: postcss.Root) {
    const assetDependencies: string[] = [];
    const onUrl: OnUrlCallback = (node) => {
        assetDependencies.push(node.url!);
    };
    ast.walkDecls((decl) => processDeclarationUrls(decl, onUrl, false));
    return assetDependencies;
}

export function isExternal(url: string) {
    return url === '' || url.startsWith('data:') || isUrl(url);
}

export function isAsset(url: string) {
    return !isExternal(url);
}

export function makeAbsolute(resourcePath: string, rootContext: string, moduleContext: string) {
    const isAbs = path.isAbsolute(resourcePath);
    let abs: string;
    if (isExternal(resourcePath) || resourcePath.startsWith('~')) {
        abs = resourcePath;
    } else if (isAbs && resourcePath.startsWith('/')) {
        abs = path.join(rootContext, resourcePath);
    } else if (isAbs) {
        abs = resourcePath;
    } else {
        abs = path.join(moduleContext, resourcePath);
    }
    return abs;
}

export function processDeclarationUrls(
    decl: postcss.Declaration,
    onUrl: OnUrlCallback,
    transform: boolean
) {
    const ast = parseValues(decl.value);
    ast.nodes.forEach((node: ParsedValue) => {
        node.nodes.forEach((node: ParsedValue) => findUrls(node, onUrl));
    });
    if (transform) {
        decl.value = stringifyValues(ast);
    }
}

function findUrls(node: ParsedValue, onUrl: OnUrlCallback) {
    const { type, nodes = [] } = node;
    switch (type) {
        case 'value':
            nodes.forEach((_: ParsedValue) => findUrls(_, onUrl));
            break;
        case 'nested-item':
            nodes.forEach((_: ParsedValue) => findUrls(_, onUrl));
            break;
        case 'url':
            onUrl(node);
            break;
    }
}

export function fixRelativeUrls(ast: postcss.Root, originPath: string, targetPath: string) {
    ast.walkDecls((decl) =>
        processDeclarationUrls(
            decl,
            (node) => {
                if (node.url && isAsset(node.url)) {
                    if (node.url.startsWith('.')) {
                        const url = path
                            .join(
                                path.relative(path.dirname(targetPath), path.dirname(originPath)),
                                node.url
                            )
                            .replace(/\\/gm, '/');
                        node.url = assureRelativeUrlPrefix(url);
                    }
                }
            },

            true
        )
    );
}

export function assureRelativeUrlPrefix(url: string) {
    return !url.startsWith('./') && !url.startsWith('../') ? './' + url : url;
}
