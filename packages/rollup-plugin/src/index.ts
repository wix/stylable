import type { Plugin } from 'rollup';
import fs from 'fs';
import { join, parse } from 'path';
import { Stylable, StylableConfig } from '@stylable/core';
import {
    emitDiagnostics,
    DiagnosticsMode,
    tryCollectImportsDeep,
} from '@stylable/core/dist/index-internal';
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
    /** @deprecated use stylableConfig to configure */
    mode?: 'development' | 'production';
    diagnosticsMode?: DiagnosticsMode;
    /** @deprecated use stylableConfig to configure */
    resolveNamespace?: typeof resolveNamespaceNode;
    /**
     * A function to override Stylable instance default configuration options
     */
    stylableConfig?: (config: StylableConfig) => StylableConfig;
    /**
     * Runs "stc" programmatically with the webpack compilation.
     * true - it will automatically detect the closest "stylable.config.js" file and use it.
     * string - it will use the provided string as the "stcConfig" file path.
     */
    stcConfig?: boolean | string;
    /** @deprecated use stylableConfig to configure */
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
const LOADABLE_CSS_QUERY = '?stylable-plain-css';
const LOADABLE_CSS = '.css' + LOADABLE_CSS_QUERY;

function getLoadableModuleData(id: string) {
    const isStFile = id.endsWith(ST_CSS);
    const isLoadableCssFile = id.endsWith(LOADABLE_CSS);
    const path = isLoadableCssFile ? id.substring(0, id.length - 19) : id;
    return {
        isStFile,
        isLoadableCssFile,
        path,
    };
}

const PRINT_ORDER = -1;
export function stylableRollupPlugin({
    optimization: { minify = false } = {},
    inlineAssets = true,
    fileName = 'stylable.css',
    diagnosticsMode = 'strict',
    mode,
    resolveNamespace,
    stylableConfig = (config: StylableConfig) => config,
    stcConfig,
    projectRoot,
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
            const stConfig = stylableConfig({
                fileSystem: fs,
                optimizer: new StylableOptimizer(),
                resolverCache: new Map(),
                requireModule,
                mode: mode || getDefaultMode(),
                projectRoot: projectRoot || process.cwd(),
                resolveNamespace: resolveNamespace || resolveNamespaceNode,
            });
            const configFromFile = resolveStcConfig(
                stConfig.projectRoot,
                typeof stcConfig === 'string' ? stcConfig : undefined,
                fs
            );

            if (stylable) {
                clearRequireCache();
                stylable.initCache();
            } else {
                stylable = new Stylable({
                    resolveModule: configFromFile?.config?.defaultConfig?.resolveModule,
                    ...stConfig,
                });
            }

            if (stcConfig) {
                if (stcBuilder) {
                    for (const sourceDirectory of stcBuilder.getProjectsSources()) {
                        this.addWatchFile(sourceDirectory);
                    }
                } else if (configFromFile && configFromFile.config.stcConfig) {
                    stcBuilder = STCBuilder.create({
                        rootDir: stConfig.projectRoot,
                        configFilePath: configFromFile.path,
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
            const { isStFile, isLoadableCssFile, path } = getLoadableModuleData(id);
            if (isLoadableCssFile || isStFile) {
                const code = fs.readFileSync(path, 'utf8');
                return { code, moduleSideEffects: isLoadableCssFile };
            }
            return null;
        },
        transform(source, id) {
            const { isStFile, isLoadableCssFile, path } = getLoadableModuleData(id);
            if (!isStFile && !isLoadableCssFile) {
                return null;
            }
            const { meta, exports } = stylable.transform(stylable.analyze(path, source));
            const assetsIds = emitAssets(this, stylable, meta, emittedAssets, inlineAssets);
            const css = generateCssString(meta, minify, stylable, assetsIds);
            const moduleImports = [];
            for (const imported of meta.getImportStatements()) {
                // attempt to resolve the request through stylable resolveModule,
                let resolved = imported.request;
                try {
                    resolved = stylable.resolver.resolvePath(imported.context, imported.request);
                } catch (e) {
                    // fallback to request
                }
                // include Stylable and native css files that have effects on other files as regular imports
                if (resolved.endsWith('.css') && !resolved.endsWith(ST_CSS)) {
                    moduleImports.push(`import ${JSON.stringify(resolved + LOADABLE_CSS_QUERY)};`);
                } else if (hasImportedSideEffects(stylable, meta, imported)) {
                    moduleImports.push(`import ${JSON.stringify(imported.request)};`);
                }
            }
            extracted.set(path, { css });

            for (const filePath of tryCollectImportsDeep(stylable, meta)) {
                this.addWatchFile(filePath);
            }

            /**
             * In case this Stylable module has sources the diagnostics will be emitted in `watchChange` hook.
             */
            if (isStFile && !stcBuilder?.getSourcesFiles(id)) {
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
                const { isStFile, isLoadableCssFile, path } = getLoadableModuleData(moduleId);
                if (isStFile || isLoadableCssFile) {
                    modules.push({ depth: calcDepth(moduleId, context, [], cache), path });
                }
            }

            sortModulesByDepth(
                modules,
                (m) => m.depth,
                (m) => m.path,
                PRINT_ORDER
            );

            outputCSS = '';

            for (const { path } of modules) {
                const stored = extracted.get(path);
                if (stored) {
                    outputCSS += extracted.get(path).css + '\n';
                } else {
                    this.error(`Missing transformed css for ${path}`);
                }
            }
            this.emitFile({ source: outputCSS, type: 'asset', fileName });
        },
    };
}

export default stylableRollupPlugin;
