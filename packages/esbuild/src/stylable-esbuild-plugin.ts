import fs, { readFileSync, writeFileSync } from 'fs';
import { relative, join, isAbsolute } from 'path';
import decache from 'decache';
import type { Plugin, PluginBuild, Metafile } from 'esbuild';
import { Stylable, StylableConfig, StylableMeta, StylableResults } from '@stylable/core';
import { StylableOptimizer } from '@stylable/optimizer';
import { resolveNamespace as resolveNamespaceNode } from '@stylable/node';
import { generateStylableJSModuleSource } from '@stylable/module-utils';
import {
    sortModulesByDepth,
    collectImportsWithSideEffects,
    processUrlDependencies,
} from '@stylable/build-tools';
import { resolveConfig } from '@stylable/cli';
import { DiagnosticsMode, emitDiagnostics } from '@stylable/core/dist/index-internal';
import { parse } from 'postcss';

const namespaces = {
    unused: 'stylable-unused',
    jsModule: 'stylable-js-module',
    css: 'stylable-css',
    nativeCss: 'stylable-native-css',
};

export interface ESBuildOptions {
    /**
     * Determine the way css is injected to the document
     * js - every js module contains the css and inject it independently
     * css - emit bundled css asset to injected via link
     */
    cssInjection?: 'js' | 'css';
    /**
     * Config how error and warning reported to esbuild by stylable
     * auto - Stylable warning will emit esbuild warning and Stylable error will emit esbuild error
     * strict - Stylable error and warning will emit esbuild error
     * loose - Stylable error and warning will emit esbuild warning
     */
    diagnosticsMode?: DiagnosticsMode;
    /**
     * A function to override Stylable instance default configuration options
     */
    stylableConfig?: (config: StylableConfig, build: PluginBuild) => StylableConfig;
    /**
     * Use to load stylable config file.
     * true - it will automatically detect the closest "stylable.config.js" file and use it.
     * false - will not load any "stylable.config.js" file.
     * string - will use the provided string as the "configFile" file path.
     */
    configFile?: boolean | string;
    /**
     * Stylable build mode
     */
    mode?: 'production' | 'development';
    /**
     * Determine the runtime stylesheet id kind used by the cssInjection js mode
     * This sets the value of the st_id attribute on the stylesheet element
     * default for dev - 'module+namespace'
     * default for prod - 'namespace'
     */
    runtimeStylesheetId?: 'module' | 'namespace' | 'module+namespace';
    /**
     * Optimization options
     */
    optimize?: {
        removeUnusedComponents?: boolean;
    };
}

export const stylablePlugin = (initialPluginOptions: ESBuildOptions = {}): Plugin => ({
    name: 'esbuild-stylable-plugin',
    setup(build: PluginBuild) {
        const {
            cssInjection,
            diagnosticsMode,
            mode,
            stylableConfig,
            configFile,
            runtimeStylesheetId,
            optimize,
        } = applyDefaultOptions(initialPluginOptions);

        enableEsbuildMetafile(build, cssInjection);

        const requireModule = createDecacheRequire(build);
        const projectRoot = build.initialOptions.absWorkingDir || process.cwd();
        const configFromFile = resolveConfig(
            projectRoot,
            typeof configFile === 'string' ? configFile : undefined,
            fs
        );
        const stConfig = stylableConfig(
            {
                mode,
                projectRoot,
                fileSystem: fs,
                optimizer: new StylableOptimizer(),
                resolverCache: new Map(),
                requireModule,
                resolveNamespace:
                    configFromFile?.config?.defaultConfig?.resolveNamespace ?? resolveNamespaceNode,
                resolveModule: configFromFile?.config?.defaultConfig?.resolveModule,
            },
            build
        );

        const stylable = new Stylable(stConfig);

        // Order of onResolve hooks matters

        build.onStart(() => {
            stylable.initCache();
        });

        /**
         * make all unused imports resolve to a special empty js module
         */
        build.onResolve({ filter: /^stylable-unused:/, namespace: namespaces.jsModule }, (args) => {
            return {
                path: stylable.resolvePath(
                    args.resolveDir,
                    args.path.replace(namespaces.unused + `:`, '')
                ),
                namespace: namespaces.unused,
            };
        });

        /**
         * handle css/stylable files imported via other stylable files
         */
        build.onResolve({ filter: /\.css$/, namespace: namespaces.jsModule }, (args) => {
            // self import of css injection
            if (args.path === args.importer) {
                return {
                    path: args.path,
                    pluginData: args.pluginData,
                    namespace: namespaces.css,
                };
            }
            // dependency import of stylable files js module
            return {
                path: stylable.resolvePath(
                    args.resolveDir,
                    args.path.replace(namespaces.nativeCss + `:`, '')
                ),
                namespace: cssInjection === 'css' ? namespaces.nativeCss : namespaces.jsModule,
                pluginData: args.pluginData,
            };
        });

        /**
         * handle all initial stylable requests from
         */
        build.onResolve({ filter: /\.st\.css$/ }, (args) => {
            return {
                path: stylable.resolvePath(args.resolveDir, args.path),
                namespace: namespaces.jsModule,
            };
        });

        /**
         * main loader for stylable files
         * this flow will create the Stylable JS modules
         */
        build.onLoad({ filter: /.*/, namespace: namespaces.jsModule }, (args) => {
            const res = stylable.transform(args.path);
            const { errors, warnings } = esbuildEmitDiagnostics(res, diagnosticsMode);
            const { imports, collector } = importsCollector(res);
            const { cssDepth = 0, deepDependencies } = res.meta.transformCssDepth!;
            const getModuleId = () => {
                switch (runtimeStylesheetId) {
                    case 'module':
                        return relative(stylable.projectRoot, args.path);
                    case 'namespace':
                        return res.meta.namespace;
                    case 'module+namespace':
                        return `${relative(stylable.projectRoot, args.path)}|${res.meta.namespace}`;
                    default:
                        throw new Error(`Unknown runtimeStylesheetId: ${runtimeStylesheetId}`);
                }
            };

            collectImportsWithSideEffects(stylable, res.meta, collector);

            if (cssInjection === 'js') {
                processAssetsAndApplyStubs(imports, res, stylable);
            }

            if (cssInjection === 'css') {
                imports.push({
                    from: args.path,
                });
            }

            const moduleCode = generateStylableJSModuleSource(
                {
                    imports,
                    namespace: res.meta.namespace,
                    jsExports: res.exports,
                    moduleType: 'esm',
                    runtimeRequest: '@stylable/runtime/esm/pure',
                },
                cssInjection === 'js'
                    ? {
                          css: res.meta.targetAst!.toString(),
                          depth: cssDepth,
                          runtimeId: 'esbuild',
                          id: getModuleId(),
                      }
                    : undefined
            );

            return {
                errors,
                warnings,
                watchFiles: [...deepDependencies],
                resolveDir: '.',
                contents: cssInjection === 'js' ? processStubs(moduleCode) : moduleCode,
                pluginData: { stylableResults: res },
            };
        });

        /**
         * unused stylable imports results in an empty js module
         */
        build.onLoad({ filter: /.*/, namespace: namespaces.unused }, (args) => {
            return {
                contents: `/* unused ${JSON.stringify(args.path)} */`,
            };
        });

        /**
         * load css via esbuild native css loader
         * we need to explicit transform here. the pluginData is for the requester module.
         * this is the final step for the css content so no pluginData is passed
         */
        build.onLoad({ filter: /.*/, namespace: namespaces.nativeCss }, (args) => {
            const res = stylable.transform(args.path);
            const cssDepth = res.meta.transformCssDepth!.cssDepth;
            return {
                resolveDir: '.',
                contents: wrapWithDepthMarkers(res.meta.targetAst!.toString(), cssDepth),
                loader: 'css',
            };
        });

        /**
         * handle css output of stylable files
         */
        build.onLoad({ filter: /.*/, namespace: namespaces.css }, (args) => {
            const { meta } = args.pluginData.stylableResults as StylableResults;
            const { cssDepth = 0 } = meta.transformCssDepth!;
            return {
                resolveDir: '.',
                contents: wrapWithDepthMarkers(meta.targetAst!.toString(), cssDepth),
                loader: 'css',
            };
        });

        /**
         * process the generated bundle and optimize the css output
         */
        build.onEnd(({ metafile }) => {
            if (cssInjection !== 'css') {
                return;
            }
            if (!metafile) {
                throw new Error('metafile is required for css injection');
            }

            const mapping = optimize.removeUnusedComponents
                ? buildUsageMapping(metafile, stylable)
                : {};

            for (const distFile of Object.keys(metafile.outputs)) {
                if (!distFile.endsWith('.css')) {
                    continue;
                }
                const distFilePath = join(stylable.projectRoot, distFile);

                writeFileSync(
                    distFilePath,
                    sortMarkersByDepth(readFileSync(distFilePath, 'utf8'), stylable, mapping)
                );
            }
        });
    },
});

function processStubs(moduleCode: string) {
    return moduleCode.replace(
        /\\"http:\/\/__stylable_url_asset_(.*?)__\\"/g,
        (_$0, $1) => `" + JSON.stringify(__css_asset_${Number($1)}__) + "`
    );
}

function processAssetsAndApplyStubs(
    imports: { from: string; defaultImport?: string }[],
    res: StylableResults,
    stylable: Stylable
) {
    processUrlDependencies({
        meta: res.meta,
        rootContext: stylable.projectRoot,
        host: {
            isAbsolute,
            join,
        },
        getReplacement: ({ index }) => `http://__stylable_url_asset_${index}__`,
    }).forEach((url, i) => {
        imports.push({
            from: url,
            defaultImport: `__css_asset_${i}__`,
        });
    });
}

function importsCollector(res: StylableResults) {
    const imports: { from: string }[] = [];
    const collector = (contextMeta: StylableMeta, absPath: string, hasSideEffects: boolean) => {
        if (hasSideEffects) {
            if (!absPath.endsWith('.st.css')) {
                // pass to the native css loader hook
                imports.push({ from: namespaces.nativeCss + `:` + absPath });
            } else {
                imports.push({ from: absPath });
            }
        } else if (contextMeta === res.meta) {
            imports.push({ from: namespaces.unused + `:` + absPath });
        }
    };
    return { imports, collector };
}

function enableEsbuildMetafile(build: PluginBuild, cssInjection: string) {
    if (cssInjection === 'css') {
        if (build.initialOptions.metafile === false) {
            console.warn(
                "'stylable-esbuild-plugin' requires the 'metafile' configuration option to be enabled for CSS injection. Since it appears to be disabled, we will automatically enable it for you. Please note that this is necessary for proper plugin functionality."
            );
        }
        build.initialOptions.metafile = true;
    }
}

function buildUsageMapping(metafile: Metafile, stylable: Stylable): OptimizationMapping {
    const usageMapping: Record<string, boolean> = {};
    const globalMappings: Record<string, Record<string, boolean>> = {};
    const usages: Record<string, Set<string>> = {};
    for (const [key] of Object.entries(metafile.inputs)) {
        if (key.startsWith(namespaces.jsModule)) {
            const path = key.replace(namespaces.jsModule + ':', '');
            const meta = stylable.fileProcessor.cache[path]?.value;
            if (!meta) {
                throw new Error(`build usage mapping failed: meta not found for ${key}`);
            }
            globalMappings[path] ||= {};
            Object.assign(globalMappings[path], meta.globals);
            usages[meta.namespace] ||= new Set();
            usages[meta.namespace].add(key);
            usageMapping[meta.namespace] = true;
        } else if (key.startsWith(namespaces.unused)) {
            const meta =
                stylable.fileProcessor.cache[key.replace(namespaces.unused + ':', '')].value;
            if (!meta) {
                throw new Error(`build usage mapping failed: meta not found for ${key}`);
            }
            // mark unused as false if not already marked as used
            usageMapping[meta.namespace] ||= false;
        }
    }
    for (const [namespace, usage] of Object.entries(usages)) {
        if (usage.size > 1) {
            console.error(
                `The namespace '${namespace}' is being used in multiple files. Please review the following file(s) and update them to use a unique namespace:\n${[
                    ...usage,
                ].join('\n')}`
            );
        }
    }
    return { usageMapping, globalMappings };
}

function esbuildEmitDiagnostics(res: StylableResults, diagnosticsMode: DiagnosticsMode) {
    const errors: { pluginName: string; text: string }[] = [];
    const warnings: { pluginName: string; text: string }[] = [];

    emitDiagnostics(
        {
            emitError(e) {
                errors.push({
                    pluginName: 'stylable',
                    text: e.message,
                });
            },
            emitWarning(e) {
                warnings.push({
                    pluginName: 'stylable',
                    text: e.message,
                });
            },
        },
        res.meta,
        diagnosticsMode,
        res.meta.source
    );
    return { errors, warnings };
}

function applyDefaultOptions(options: ESBuildOptions, prod = true): Required<ESBuildOptions> {
    const mode = options.mode ?? (prod ? 'production' : 'development');
    return {
        mode,
        cssInjection: 'css',
        diagnosticsMode: 'auto',
        stylableConfig: (config) => config,
        configFile: true,
        runtimeStylesheetId: mode === 'production' ? 'namespace' : 'module+namespace',
        ...options,
        optimize: {
            removeUnusedComponents: prod,
            ...options.optimize,
        },
    };
}

function createDecacheRequire(build: PluginBuild) {
    const cacheIds = new Set<string>();
    build.onStart(() => {
        for (const id of cacheIds) {
            decache(id);
        }
        cacheIds.clear();
    });
    return (id: string) => {
        cacheIds.add(id);
        return require(id);
    };
}

function wrapWithDepthMarkers(css: string, depth: number | string) {
    return `[stylable-depth]{--depth:${depth}}${css}[stylable-depth]{--end:${depth}}`;
}

interface OptimizationMapping {
    usageMapping?: Record<string, boolean>;
    globalMappings?: Record<string, Record<string, boolean>>;
}

function sortMarkersByDepth(
    css: string,
    stylable: Stylable,
    { usageMapping, globalMappings }: OptimizationMapping
) {
    const extracted: { depth: number; css: string; path: string }[] = [];
    const leftOverCss = css.replace(
        /(\/\* stylable-?\w*?-css:[\s\S]*?\*\/[\s\S]*?)?\[stylable-depth\][\s\S]*?\{[\s\S]*?--depth:[\s\S]*?(\d+)[\s\S]*?\}([\s\S]*?)\[stylable-depth\][\s\S]*?\{[\s\S]*?--end:[\s\S]*?\d+[\s\S]*?\}/g,
        (...args) => {
            const { 1: esbuildComment, 2: depth, 3: css } = args;
            extracted.push({
                depth: parseInt(depth, 10),
                css: (esbuildComment || '') + css,
                path: esbuildComment.match(/\/\* stylable-?\w*?-css:([\s\S]*?)\s*\*\//)?.[1] || '',
            });
            return '';
        }
    );

    const sorted = sortModulesByDepth(
        extracted,
        (m) => m.depth,
        (m) => m.path,
        -1
    );

    return (
        leftOverCss.trimStart() +
        sorted
            .map((m) =>
                usageMapping && globalMappings
                    ? removeUnusedComponents(m.css, stylable, usageMapping, globalMappings[m.path])
                    : m.css
            )
            .join('')
    );
}

const stubExports = {
    classes: {},
    containers: {},
    keyframes: {},
    vars: {},
    layers: {},
    stVars: {},
};

function removeUnusedComponents(
    css: string,
    stylable: Stylable,
    usageMapping: Record<string, boolean>,
    // global mapping per stylable meta
    globalMappings: Record<string, boolean>
) {
    const ast = parse(css);
    stylable.optimizer?.optimizeAst(
        { removeUnusedComponents: true },
        ast,
        usageMapping,
        stubExports,
        globalMappings
    );
    return ast.toString();
}
