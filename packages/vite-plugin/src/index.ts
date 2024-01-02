import type { PluginOption } from 'vite';
import { hasImportedSideEffects } from '@stylable/build-tools';
import { resolveConfig as resolveStcConfig, STCBuilder } from '@stylable/cli';
import type { DiagnosticsMode } from '@stylable/core/dist/index-internal';
import { emitDiagnostics, tryCollectImportsDeep } from '@stylable/core/dist/index-internal';
import { resolveNamespace as resolveNamespaceNode } from '@stylable/node';
import { StylableOptimizer } from '@stylable/optimizer';
import decache from 'decache';
import fs from 'fs';
import { Stylable } from '@stylable/core';
import {
    emitAssets,
    generateCssString,
    generateStylableModuleCode,
    getDefaultMode,
} from './plugin-utils';

export interface StylableVitePluginOptions {
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

export function viteStylable({
    optimization: { minify = false } = {},
    inlineAssets = true,
    // Change when WSR works without it?
    diagnosticsMode = 'loose',
    mode = getDefaultMode(),
    resolveNamespace = resolveNamespaceNode,
    stcConfig,
    projectRoot = process.cwd(),
}: StylableVitePluginOptions = {}): PluginOption {
    let stylable!: Stylable;
    let extracted!: Map<string, { css: string }>;
    let emittedAssets!: Map<string, string>;
    let stcBuilder: STCBuilder | undefined;

    return {
        enforce: 'pre',
        name: 'stylable',
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
            // Strip any resource queries
            const idWithoutQuery = id.split('?')[0];

            // When loading `*.st.css.js.css` modules -
            // we read the virtual css chunk we generated when transforming
            if (idWithoutQuery.endsWith(`${ST_CSS}.js.css`)) {
                const code = extracted.get(
                    // We strip away the `.css` extension and the `\0` prefix
                    idWithoutQuery.slice(1, -1 * '.css'.length)
                );
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                return { code: code!.css };
            }

            // So when loading `*.st.css.js` modules -
            // we read the actual `*.st.css` file so our transform alone can process it
            if (idWithoutQuery.endsWith(`${ST_CSS}.js`)) {
                const code = fs.readFileSync(
                    // We strip away the `.js` extension and the `\0` prefix
                    idWithoutQuery.slice(1, -1 * '.js'.length),
                    'utf8'
                );
                return { code, moduleSideEffects: false };
            }
            return null;
        },
        async resolveId(id, importer, options) {
            const [idWithoutQuery, query] = id.split('?');

            // Here we fake-resolve our virtual `*.st.css.js.css` CSS modules
            // otherwise our generated `*.st.css.js.css` import fails resolution
            if (idWithoutQuery.endsWith(`${ST_CSS}.js.css`)) {
                const resolution = await this.resolve(
                    `${idWithoutQuery.slice(1, -1 * '.js.css'.length)}${query ? `?${query}` : ''}`,
                    importer,
                    {
                        skipSelf: true,
                        ...options,
                    }
                );
                if (!resolution) {
                    return resolution;
                }

                const [resolvedWithoutQuery, resolvedQuery] = resolution.id.split('?');
                return {
                    ...resolution,
                    id: `\0${resolvedWithoutQuery}.js.css${
                        resolvedQuery ? `?${resolvedQuery}` : ''
                    }`,
                };
            }

            // Here we reroute `*.st.css` imports to `*.st.css.js` imports.
            // We do this to avoid Vite's built-in CSS plugin
            // from parsing our generated ES module as CSS.
            if (idWithoutQuery.endsWith(ST_CSS)) {
                const resolution = await this.resolve(id, importer, {
                    skipSelf: true,
                    ...options,
                });

                if (!resolution) {
                    return resolution;
                }

                const [resolvedWithoutQuery, query] = resolution.id.split('?');
                return {
                    ...resolution,
                    id: `\0${resolvedWithoutQuery}.js${query ? `?${query}` : ''}`,
                };
            }
            return null;
        },
        transform(source, id) {
            const [idWithoutQuery] = id.split('?');

            // We only transform the rerouted `*.st.css.js` imports
            if (!idWithoutQuery.endsWith(`${ST_CSS}.js`)) {
                return null;
            }
            const { meta, exports } = stylable.transform(
                stylable.analyze(
                    idWithoutQuery.slice(
                        // Remove our conventional `\0` prefix
                        1,
                        // We strip away the fake `.js` extension as far as Stylable is concerned
                        -3
                    ),
                    source
                )
            );
            const assetsIds = emitAssets(this, stylable, meta, emittedAssets, inlineAssets);
            const css = generateCssString(meta, minify, stylable, assetsIds);
            const moduleImports = [];
            for (const imported of meta.getImportStatements()) {
                if (hasImportedSideEffects(stylable, meta, imported)) {
                    moduleImports.push(`import ${JSON.stringify(imported.request)};`);
                }
            }
            extracted.set(idWithoutQuery.slice(1), { css });

            for (const filePath of tryCollectImportsDeep(stylable.resolver, meta)) {
                this.addWatchFile(filePath);
            }

            /**
             * In case this Stylable module has sources the diagnostics will be emitted in `watchChange` hook.
             */
            if (
                !stcBuilder?.getSourcesFiles(
                    idWithoutQuery.slice(
                        // Remove our conventional `\0` prefix
                        1,
                        // We strip away the fake `.js` extension as far as Stylable is concerned
                        -3
                    )
                )
            ) {
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
                code: generateStylableModuleCode(id, meta, exports, moduleImports),
                map: { mappings: '' },
            };
        },
    };
}
