import * as postcss from 'postcss';
import * as path from './path';
import { ImportSymbol, RefedMixin, StylableMeta } from './stylable-processor';
import { ParsedValue } from './types';

const { parseValues, stringifyValues } = require('css-selector-tokenizer');
const isUrl = require('url-regex')({ exact: true, strict: true });

export type OnUrlCallback = (node: ParsedValue) => void;

export function collectAssets(ast: postcss.Root) {
    const assetDependencies: string[] = [];
    const onUrl: OnUrlCallback = node => {
        assetDependencies.push(node.url!);
    };
    ast.walkDecls(decl => processDeclarationUrls(decl, onUrl, false));
    return assetDependencies;
}

export function isExternal(url: string) {
    return url === '' || url.startsWith('data:') || isUrl.test(url);
}

export function isAsset(url: string) {
    return !isExternal(url);
}

export function makeAbsolute(resourcePath: string, rootContext: string, moduleContext: string) {
    const isAbs = path.isAbsolute(resourcePath);
    let abs: string;
    if (isExternal(resourcePath)) {
        abs = resourcePath;
    } else if (isAbs && resourcePath[0] === '/') {
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
        node.nodes!.forEach((node: ParsedValue) => findUrls(node, onUrl));
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

export function fixRelativeUrls(ast: postcss.Root, mix: RefedMixin, targetMeta: StylableMeta) {
    ast.walkDecls(decl =>
        processDeclarationUrls(
            decl,
            node => {
                if (isAsset(node.url!)) {
                    if (node.url![0] === '.') {
                        node.url =
                            './' +
                            path
                                .join(
                                    path.relative(
                                        path.dirname(targetMeta.source),
                                        path.dirname((mix.ref as ImportSymbol).import.from)
                                    ),
                                    node.url!
                                )
                                .replace(/\\/gm, '/');
                    }
                }
            },
            true
        )
    );
}
