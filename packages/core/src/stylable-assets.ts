import path from 'path';
import type * as postcss from 'postcss';
import { processDeclarationFunctions } from './process-declaration-functions';

function isExternal(url: string) {
    return url === '' || url.startsWith('data:') || isUrl(url);
}

function isUrl(maybeUrl: string) {
    maybeUrl = maybeUrl.trim();
    if (maybeUrl.includes(' ')) {
        return false;
    }
    try {
        new URL(maybeUrl);
        return true;
    } catch {
        return false;
    }
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

export function fixRelativeUrls(ast: postcss.Root, originPath: string, targetPath: string) {
    ast.walkDecls((decl) => {
        processDeclarationFunctions(
            decl,
            (node) => {
                if (node.type === 'url') {
                    if (!node.url || !isAsset(node.url) || !node.url.startsWith('.')) {
                        return;
                    }
                    const url = path
                        .join(
                            path.relative(path.dirname(targetPath), path.dirname(originPath)),
                            node.url
                        )
                        .replace(/\\/gm, '/');
                    node.url = assureRelativeUrlPrefix(url);
                }
            },
            true
        );
    });
}

export function assureRelativeUrlPrefix(url: string) {
    return !url.startsWith('./') && !url.startsWith('../') ? './' + url : url;
}
