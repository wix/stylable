import type { Stylable, StylableMeta } from '@stylable/core';
import type { StylableExports } from '@stylable/core/dist/index-internal';
import { processUrlDependencies } from '@stylable/build-tools';
import fs from 'fs';
import { basename, extname, isAbsolute, join } from 'path';
import { createHash } from 'crypto';
import mime from 'mime';
import type { Plugin } from 'vite';
import type { StylableVitePluginOptions } from './index';

type ObjectHook<T, O = {}> = T | ({ handler: T; order?: 'pre' | 'post' | null } & O);
type GetThisParameters<T extends (this: any, ...args: any) => any> = T extends (
    this: infer P,
    ...args: any
) => any
    ? P
    : never;

type VitePluginTransfrom = GetThisParameters<
    Plugin['transform'] extends ObjectHook<infer T, {}> ? NonNullable<T> : false
>;

export function generateStylableModuleCode(
    id: string,
    meta: StylableMeta,
    exports: StylableExports,
    moduleImports: string[]
) {
    const [idWithoutQuery, query] = id.split('?');
    return `
        import { classesRuntime, statesRuntime } from '@stylable/runtime/esm/pure';
        ${moduleImports.join('\n')}

        import '${idWithoutQuery}.css${query ? `?${query}` : ''}';

        export var namespace = ${JSON.stringify(meta.namespace)};
        export var st = classesRuntime.bind(null, namespace);
        export var style = st;
        export var cssStates = statesRuntime.bind(null, namespace);
        export var classes = ${JSON.stringify(exports.classes)};
        export var keyframes = ${JSON.stringify(exports.keyframes)};
        export var layers = ${JSON.stringify(exports.layers)};
        export var stVars = ${JSON.stringify(exports.stVars)};
        export var vars = ${JSON.stringify(exports.vars)};
    `;
}

export function generateCssString(
    meta: StylableMeta,
    minify: boolean,
    stylable: Stylable,
    assetsIds: string[]
) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const css = meta
        .targetAst!.toString()
        .replace(/__stylable_url_asset_(.*?)__/g, (_$0, $1) => assetsIds[Number($1)]);

    if (minify && stylable.optimizer) {
        return stylable.optimizer.minifyCSS(css);
    }
    return css;
}

export function emitAssets(
    ctx: VitePluginTransfrom,
    stylable: Stylable,
    meta: StylableMeta,
    emittedAssets: Map<string, string>,
    inlineAssets: StylableVitePluginOptions['inlineAssets']
): string[] {
    const assets = processUrlDependencies({
        meta,
        rootContext: stylable.projectRoot,
        host: {
            isAbsolute,
            join,
        },
    });
    const assetsIds: string[] = [];
    for (const asset of assets) {
        const fileBuffer = fs.readFileSync(asset);
        const shouldInline =
            typeof inlineAssets === 'function' ? inlineAssets(asset, fileBuffer) : inlineAssets;

        if (shouldInline) {
            const mimeType = mime.getType(extname(asset));
            assetsIds.push(`data:${mimeType};base64,${fileBuffer.toString('base64')}`);
        } else {
            const name = basename(asset);
            let hash = emittedAssets.get(asset);
            if (hash) {
                assetsIds.push(`${hash}_${name}`);
            } else {
                const fileBuffer = fs.readFileSync(asset);
                hash = createHash('sha1').update(fileBuffer).digest('hex');
                const fileName = `${hash}_${name}`;
                if (emittedAssets.has(fileName)) {
                    assetsIds.push(fileName);
                } else {
                    emittedAssets.set(fileName, hash);
                    emittedAssets.set(asset, hash);
                    assetsIds.push(fileName);
                    ctx.emitFile({
                        type: 'asset',
                        fileName,
                        source: fileBuffer,
                    });
                }
            }
        }
    }
    return assetsIds;
}

export function getDefaultMode(): 'development' | 'production' {
    if (process.env.NODE_ENV === 'production') {
        return 'production';
    }
    if (process.env.ROLLUP_WATCH) {
        return 'development';
    }
    return 'production';
}
