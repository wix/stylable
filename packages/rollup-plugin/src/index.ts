import {
    Stylable,
    StylableExports,
    StylableMeta,
    visitMetaCSSDependenciesBFS,
    emitDiagnostics,
    DiagnosticsMode,
} from '@stylable/core';
import {
    getUrlDependencies,
    sortModulesByDepth,
    calcDepth,
    CalcDepthContext,
    hasImportedSideEffects,
} from '@stylable/build-tools';
import { resolveNamespace as resolveNamespaceNode } from '@stylable/node';
import { StylableOptimizer } from '@stylable/optimizer';
import { nodeFs } from '@file-services/node';
import { createHash } from 'crypto';
import { Plugin, PluginContext } from 'rollup';
import { getType } from 'mime';
import { join, parse } from 'path';

const production = !process.env.ROLLUP_WATCH;

export interface StylableRollupPluginOptions {
    optimization?: {
        minify?: boolean;
    };
    inlineAssets?: boolean | ((filepath: string, buffer: Buffer) => boolean);
    fileName?: string;
    diagnosticsMode?: DiagnosticsMode;
    resolveNamespace?: typeof resolveNamespaceNode;
}

const ST_CSS = '.st.css';

const PRINT_ORDER = -1;
export function stylableRollupPlugin({
    optimization: { minify = false } = {},
    inlineAssets = true,
    fileName = 'stylable.css',
    diagnosticsMode = 'strict',
    resolveNamespace = resolveNamespaceNode,
}: StylableRollupPluginOptions = {}): Plugin {
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
            if (id.endsWith(ST_CSS)) {
                const code = nodeFs.readFileSync(id, 'utf8');
                return { code, moduleSideEffects: false };
            }
            return null;
        },
        transform(source, id) {
            if (!id.endsWith(ST_CSS)) {
                return null;
            }
            const { meta, exports } = stylable.transform(source, id);
            const assetsIds = emitAssets(this, stylable, meta, emittedAssets, inlineAssets);
            const css = generateCssString(meta, minify, stylable, assetsIds);
            const moduleImports = [];
            for (const imported of meta.imports) {
                if (hasImportedSideEffects(stylable, meta, imported)) {
                    moduleImports.push(`import ${JSON.stringify(imported.request)};`);
                }
            }
            extracted.set(id, { css });

            visitMetaCSSDependenciesBFS(
                meta,
                (dep) => {
                    this.addWatchFile(dep.source);
                },
                stylable.createResolver()
            );

            emitDiagnostics(
                {
                    emitError: (e) => this.error(e),
                    emitWarning: (e) => this.warn(e),
                },
                meta,
                diagnosticsMode
            );

            return {
                code: generateStylableModuleCode(meta, exports, moduleImports),
                map: { mappings: '' },
            };
        },
        buildEnd() {
            const modules = [];
            const cache = new Map();

            const context: CalcDepthContext<string> = {
                getDependencies: (module) => this.getModuleInfo(module)!.importedIds,
                getImporters: (module) => this.getModuleInfo(module)!.importers,
                isStylableModule: (module) => module.endsWith(ST_CSS),
                getModulePathNoExt: (module) => {
                    if (module.endsWith(ST_CSS)) {
                        return module.replace(/\.st\.css$/, '');
                    }
                    const { dir, name } = parse(module);
                    return join(dir, name);
                },
            };

            for (const moduleId of this.getModuleIds()) {
                if (moduleId.endsWith(ST_CSS)) {
                    modules.push({ depth: calcDepth(moduleId, context, [], cache), moduleId });
                }
            }

            sortModulesByDepth(
                modules,
                (m) => m.depth,
                (m) => m.moduleId,
                PRINT_ORDER
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

const runtimePath = JSON.stringify(require.resolve('@stylable/rollup-plugin/runtime'));
const runtimeImport = `import { stc, sts } from ${runtimePath};`;

function generateStylableModuleCode(
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
    inlineAssets: StylableRollupPluginOptions['inlineAssets']
): string[] {
    const assets = getUrlDependencies(meta, stylable.projectRoot);
    const assetsIds: string[] = [];
    for (const asset of assets) {
        const fileBuffer = nodeFs.readFileSync(asset);
        const shouldInline =
            typeof inlineAssets === 'function' ? inlineAssets(asset, fileBuffer) : inlineAssets;

        if (shouldInline) {
            const mimeType = getType(nodeFs.extname(asset));
            assetsIds.push(`data:${mimeType};base64,${fileBuffer.toString('base64')}`);
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

export default stylableRollupPlugin;
