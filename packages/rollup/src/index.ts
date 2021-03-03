import {
    Stylable,
    StylableMeta,
    StylableResults,
    visitMetaCSSDependenciesBFS,
} from '@stylable/core';
import { getUrlDependencies, sortModulesByDepth } from '@stylable/build-tools';
import { resolveNamespace as resolveNamespaceNode } from '@stylable/node';
import { StylableOptimizer } from '@stylable/optimizer';
import { nodeFs } from '@file-services/node';
import { createHash } from 'crypto';
import { Plugin, PluginContext } from 'rollup';
import { getType } from 'mime';
import { calcDepth } from './calc-depth';

const production = !process.env.ROLLUP_WATCH;

interface PluginOptions {
    minify?: boolean;
    inlineAssets?: boolean;
    fileName?: string;
    resolveNamespace?: typeof resolveNamespaceNode;
}

export function stylableRollupPlugin({
    minify = false,
    inlineAssets = true,
    fileName = 'stylable.css',
    resolveNamespace = resolveNamespaceNode,
}: PluginOptions = {}): Plugin {
    let stylable!: Stylable;
    let extracted!: Map<any, any>;
    let emittedAssets!: Map<string, string>;
    let outputCSS = '';
    return {
        name: 'Stylable',
        buildStart(rollupOptions) {
            extracted = extracted || new Map();
            emittedAssets = emittedAssets || new Map();
            if (stylable) {
                stylable.initCache();
            } else {
                stylable = Stylable.create({
                    fileSystem: nodeFs,
                    projectRoot: rollupOptions.context,
                    mode: production ? 'production' : 'development',
                    resolveNamespace,
                    optimizer: new StylableOptimizer(),
                    resolverCache: new Map(),
                });
            }
        },
        load(id) {
            if (id.endsWith('.st.css')) {
                const code = nodeFs.readFileSync(id, 'utf8');
                return { code, moduleSideEffects: false };
            }
            return null;
        },
        transform(source, id) {
            if (!id.endsWith('.st.css')) {
                return null;
            }
            const res = stylable.transform(source, id);
            const assetsIds = emitAssets(this, stylable, res.meta, emittedAssets, inlineAssets);
            const css = generateCssString(res.meta, minify, stylable, assetsIds);

            visitMetaCSSDependenciesBFS(
                res.meta,
                (dep) => {
                    this.addWatchFile(dep.source);
                },
                stylable.createResolver()
            );

            extracted.set(id, { css });

            return {
                code: generateStylableModuleCode(res),
                map: { mappings: '' },
            };
        },
        buildEnd() {
            const modules = [];
            for (const moduleId of this.getModuleIds()) {
                if (moduleId.endsWith('.st.css')) {
                    modules.push({ depth: calcDepth(moduleId, this), moduleId });
                }
            }

            sortModulesByDepth(
                modules,
                (m) => m.depth,
                (m) => m.moduleId
            );

            outputCSS = '';

            for (const { moduleId } of modules) {
                const stored = extracted.get(moduleId);
                if (stored) {
                    outputCSS += extracted.get(moduleId).css + '\n';
                } else {
                    this.error(`Missing transformed css for ${moduleId}`);
                }
            }
            this.emitFile({ source: outputCSS, type: 'asset', fileName });
        },
    };
}

const runtimeImport = `import {style as stc, cssStates as sts} from ${JSON.stringify(
    require.resolve('@stylable/rollup/runtime')
)};`;

function generateStylableModuleCode(res: StylableResults) {
    return `
        ${runtimeImport}
        export var namespace = ${JSON.stringify(res.meta.namespace)};
        export var st = stc.bind(null, namespace);
        export var style = st;
        export var cssStates = sts.bind(null, namespace);
        export var classes = ${JSON.stringify(res.exports.classes)}; 
        export var keyframes = ${JSON.stringify(res.exports.keyframes)}; 
        export var stVars = ${JSON.stringify(res.exports.stVars)}; 
        export var vars = ${JSON.stringify(res.exports.vars)}; 
    `;
}

function generateCssString(
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

function emitAssets(
    ctx: PluginContext,
    stylable: Stylable,
    meta: StylableMeta,
    emittedAssets: Map<string, string>,
    inlineAssets: boolean
): string[] {
    const assets = getUrlDependencies(meta, stylable.projectRoot);
    const assetsIds: string[] = [];
    for (const asset of assets) {
        if (inlineAssets) {
            const fileBuffer = nodeFs.readFileSync(asset, 'base64');
            const mimeType = getType(nodeFs.extname(asset));
            assetsIds.push(`data:${mimeType};base64,${fileBuffer}`);
        } else {
            const name = nodeFs.basename(asset);
            let hash = emittedAssets.get(asset);
            if (hash) {
                assetsIds.push(`${hash}_${name}`);
            } else {
                const fileBuffer = nodeFs.readFileSync(asset);
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
