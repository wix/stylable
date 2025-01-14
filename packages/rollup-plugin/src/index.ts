import type { Plugin } from 'rollup';
import { nodeFs as fs } from '@file-services/node';
import { join, parse } from 'path';
import { Stylable, StylableConfig, generateStylableJSModuleSource } from '@stylable/core';
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
    collectImportsWithSideEffects,
} from '@stylable/build-tools';
import { packageJsonLookupCache, resolveNamespace as resolveNamespaceNode } from '@stylable/node';
import { StylableOptimizer } from '@stylable/optimizer';
import decache from 'decache';
import { emitAssets, generateCssString, getDefaultMode } from './plugin-utils.js';
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
    /**
     * Set true for an improved side-effect detection to include stylesheets with deep global side-effects.
     * Defaults to true.
     */
    includeGlobalSideEffects?: boolean;
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
    includeGlobalSideEffects = true,
}: StylableRollupPluginOptions = {}): Plugin {
    let stylable!: Stylable;
    let extracted!: Map<any, any>;
    let emittedAssets!: Map<string, string>;
    let outputCSS = '';
    let stcBuilder: STCBuilder | undefined;
    let configFromFile: ReturnType<typeof resolveStcConfig> | undefined;
    return {
        name: 'Stylable',
        buildStart() {
            extracted = extracted || new Map();
            emittedAssets = emittedAssets || new Map();

            if (stylable) {
                clearRequireCache();
                stylable.initCache();
                packageJsonLookupCache.clear();
            } else {
                const stConfig = stylableConfig({
                    fileSystem: fs,
                    optimizer: new StylableOptimizer(),
                    requireModule,
                    mode: mode || getDefaultMode(),
                    projectRoot: projectRoot || process.cwd(),
                    resolveNamespace: resolveNamespace || resolveNamespaceNode,
                });
                configFromFile = resolveStcConfig(
                    stConfig.projectRoot,
                    fs,
                    typeof stcConfig === 'string' ? stcConfig : undefined,
                );

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
                        rootDir: stylable.projectRoot,
                        configFilePath: configFromFile.path,
                        watchMode: this.meta.watchMode,
                    });

                    stcBuilder.build();

                    for (const sourceDirectory of stcBuilder.getProjectsSources()) {
                        this.addWatchFile(sourceDirectory);
                    }

                    stcBuilder.reportDiagnostics(
                        {
                            emitWarning: (e) => this.warn(e),
                            emitError: (e) => this.error(e),
                        },
                        diagnosticsMode,
                    );
                }
            }
        },
        watchChange(id) {
            if (stcBuilder) {
                stcBuilder.rebuild([id]);

                stcBuilder.reportDiagnostics(
                    {
                        emitWarning: (e) => this.warn(e),
                        emitError: (e) => this.error(e),
                    },
                    diagnosticsMode,
                );
            }
        },
        load(id) {
            const { isStFile, isLoadableCssFile, path } = getLoadableModuleData(id);
            if (isLoadableCssFile || isStFile) {
                const code = fs.readFileSync(path, 'utf8');
                this.addWatchFile(path);
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
            const moduleImports: { from: string }[] = [];

            if (includeGlobalSideEffects) {
                // new mode that collect deep side effects
                collectImportsWithSideEffects(stylable, meta, (_contextMeta, absPath, isUsed) => {
                    if (isUsed) {
                        if (!absPath.endsWith(ST_CSS)) {
                            moduleImports.push({
                                from: absPath + LOADABLE_CSS_QUERY,
                            });
                        } else {
                            moduleImports.push({
                                from: absPath,
                            });
                        }
                    }
                });
            } else {
                // legacy mode - only shallow imported side-effects
                for (const imported of meta.getImportStatements()) {
                    // attempt to resolve the request through stylable resolveModule,
                    let resolved = imported.request;
                    try {
                        resolved = stylable.resolver.resolvePath(
                            imported.context,
                            imported.request,
                        );
                    } catch {
                        // fallback to request
                    }
                    // include Stylable and native css files that have effects on other files as regular imports
                    if (resolved.endsWith('.css') && !resolved.endsWith(ST_CSS)) {
                        moduleImports.push({
                            from: resolved + LOADABLE_CSS_QUERY,
                        });
                    } else if (hasImportedSideEffects(stylable, meta, imported)) {
                        moduleImports.push({
                            from: imported.request,
                        });
                    }
                }
            }

            extracted.set(path, { css });

            for (const filePath of tryCollectImportsDeep(stylable.resolver, meta)) {
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
                    diagnosticsMode,
                );
            }

            const code = generateStylableJSModuleSource({
                jsExports: exports,
                moduleType: 'esm',
                namespace: meta.namespace,
                varType: 'var',
                imports: moduleImports,
            });

            return {
                code,
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
                PRINT_ORDER,
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
