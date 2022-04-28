import type { Plugin } from 'rollup';
import fs from 'fs';
import { join, parse } from 'path';
import { Stylable } from '@stylable/core';
import { emitDiagnostics, DiagnosticsMode } from '@stylable/core/dist/index-internal';
import {
    sortModulesByDepth,
    calcDepth,
    CalcDepthContext,
    hasImportedSideEffects,
} from '@stylable/build-tools';
import { resolveNamespace as resolveNamespaceNode } from '@stylable/node';
import { StylableOptimizer } from '@stylable/optimizer';
import decache from 'decache';
import {
    emitAssets,
    generateCssString,
    generateStylableModuleCode,
    getDefaultMode,
} from './plugin-utils';
import { resolveConfig as resolveStcConfig, STCBuilder } from '@stylable/cli';

export interface StylableRollupPluginOptions {
    optimization?: {
        minify?: boolean;
    };
    inlineAssets?: boolean | ((filepath: string, buffer: Buffer) => boolean);
    fileName?: string;
    mode?: 'development' | 'production';
    diagnosticsMode?: DiagnosticsMode;
    resolveNamespace?: typeof resolveNamespaceNode;
    /**
     * Runs "stc" programmatically with the webpack compilation.
     * true - it will automatically detect the closest "stylable.config.js" file and use it.
     * string - it will use the provided string as the "stcConfig" file path.
     */
    stcConfig?: boolean | string;
    projectRoot?: string;
}

const requireModuleCache = new Set<string>();
const requireModule = (id: string) => {
    requireModuleCache.add(id);
    return require(id);
};
const clearRequireCache = () => {
    for (const id of requireModuleCache) {
        decache(id);
    }
    requireModuleCache.clear();
};

const ST_CSS = '.st.css';

const PRINT_ORDER = -1;
export function stylableRollupPlugin({
    optimization: { minify = false } = {},
    inlineAssets = true,
    fileName = 'stylable.css',
    diagnosticsMode = 'strict',
    mode = getDefaultMode(),
    resolveNamespace = resolveNamespaceNode,
    stcConfig,
    projectRoot = process.cwd(),
}: StylableRollupPluginOptions = {}): Plugin {
    let stylable!: Stylable;
    let extracted!: Map<any, any>;
    let emittedAssets!: Map<string, string>;
    let outputCSS = '';
    let stcBuilder: STCBuilder | undefined;

    return {
        name: 'Stylable',
        async buildStart() {
            extracted = extracted || new Map();
            emittedAssets = emittedAssets || new Map();
            if (stylable) {
                clearRequireCache();
                stylable.initCache();
            } else {
                stylable = new Stylable({
                    fileSystem: fs,
                    projectRoot,
                    mode,
                    resolveNamespace,
                    optimizer: new StylableOptimizer(),
                    resolverCache: new Map(),
                    requireModule,
                });
            }

            if (stcConfig) {
                if (stcBuilder) {
                    for (const sourceDirectory of stcBuilder.getProjectsSources()) {
                        this.addWatchFile(sourceDirectory);
                    }
                } else {
                    const configuration = resolveStcConfig(
                        projectRoot,
                        typeof stcConfig === 'string' ? stcConfig : undefined
                    );

                    if (!configuration) {
                        throw new Error(
                            `Could not find "stcConfig"${
                                typeof stcConfig === 'string' ? ` at "${stcConfig}"` : ''
                            }`
                        );
                    }

                    stcBuilder = STCBuilder.create({
                        rootDir: projectRoot,
                        configFilePath: configuration.path,
                        watchMode: this.meta.watchMode,
                    });

                    await stcBuilder.build();

                    for (const sourceDirectory of stcBuilder.getProjectsSources()) {
                        this.addWatchFile(sourceDirectory);
                    }

                    stcBuilder.reportDiagnostics(
                        {
                            emitWarning: (e) => this.warn(e),
                            emitError: (e) => this.error(e),
                        },
                        diagnosticsMode
                    );
                }
            }
        },
        async watchChange(id) {
            if (stcBuilder) {
                await stcBuilder.rebuild([id]);

                stcBuilder.reportDiagnostics(
                    {
                        emitWarning: (e) => this.warn(e),
                        emitError: (e) => this.error(e),
                    },
                    diagnosticsMode
                );
            }
        },
        load(id) {
            if (id.endsWith(ST_CSS)) {
                const code = fs.readFileSync(id, 'utf8');
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
            for (const imported of meta.getImportStatements()) {
                if (hasImportedSideEffects(stylable, meta, imported)) {
                    moduleImports.push(`import ${JSON.stringify(imported.request)};`);
                }
            }
            extracted.set(id, { css });

            for (const dependency of stylable.getDependencies(meta)) {
                this.addWatchFile(dependency.resolvedPath);
            }

            /**
             * In case this Stylable module has sources the diagnostics will be emitted in `watchChange` hook.
             */
            if (!stcBuilder?.getSourcesFiles(id)) {
                emitDiagnostics(
                    {
                        emitWarning: (e: Error) => this.warn(e),
                        emitError: (e: Error) => this.error(e),
                    },
                    meta,
                    diagnosticsMode
                );
            }

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

export default stylableRollupPlugin;
