import type { Stylable, StylableMeta } from '@stylable/core';
import type { PluginContext } from 'rollup';
import type { StylableRollupPluginOptions } from './index';
import { processUrlDependencies } from '@stylable/build-tools';
import fs from 'fs';
import { basename, extname } from 'path';
import { createHash } from 'crypto';
import { getType } from 'mime';

export function generateCssString(
    meta: StylableMeta,
    minify: boolean,
    stylable: Stylable,
    assetsIds: string[]
) {
    const css = meta
        .targetAst!.toString()
        .replace(/__stylable_url_asset_(.*?)__/g, (_$0, $1) => assetsIds[Number($1)]);

    if (minify && stylable.optimizer) {
        return stylable.optimizer.minifyCSS(css);
    }
    return css;
}

export function emitAssets(
    ctx: PluginContext,
    stylable: Stylable,
    meta: StylableMeta,
    emittedAssets: Map<string, string>,
    inlineAssets: StylableRollupPluginOptions['inlineAssets']
): string[] {
    const assets = processUrlDependencies(meta, stylable.projectRoot);
    const assetsIds: string[] = [];
    for (const asset of assets) {
        const fileBuffer = fs.readFileSync(asset);
        const shouldInline =
            typeof inlineAssets === 'function' ? inlineAssets(asset, fileBuffer) : inlineAssets;

        if (shouldInline) {
            const mimeType = getType(extname(asset));
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
