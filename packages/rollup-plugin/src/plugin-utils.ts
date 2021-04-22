import { Stylable, StylableExports, StylableMeta } from '@stylable/core';
import { processUrlDependencies } from '@stylable/build-tools';
import fs from 'fs';
import { basename, extname } from 'path';
import { createHash } from 'crypto';
import { PluginContext } from 'rollup';
import { getType } from 'mime';
import { StylableRollupPluginOptions } from './index';

const runtimePath = JSON.stringify(require.resolve('@stylable/rollup-plugin/runtime'));
const runtimeImport = `import { stc, sts } from ${runtimePath};`;

export function generateStylableModuleCode(
    meta: StylableMeta,
    exports: StylableExports,
    moduleImports: string[]
) {
    return `
        ${runtimeImport}
        ${moduleImports.join('\n')}
        export var namespace = ${JSON.stringify(meta.namespace)};
        export var st = sts.bind(null, namespace);
        export var style = st;
        export var cssStates = stc.bind(null, namespace);
        export var classes = ${JSON.stringify(exports.classes)}; 
        export var keyframes = ${JSON.stringify(exports.keyframes)}; 
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
    const css = meta
        .outputAst!.toString()
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
