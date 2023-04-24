import fs, { readFileSync, writeFileSync } from 'fs';
import { relative, join, isAbsolute } from 'path';
import decache from 'decache';
import type { Plugin, PluginBuild, Metafile } from 'esbuild';
import { Stylable, StylableConfig, StylableResults } from '@stylable/core';
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
    jsModule: 'stylable-js-module',
    css: 'stylable-css',
    nativeCss: 'stylable-native-css',
};

interface ESBuildOptions {
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
     * false - it will not load any "stylable.config.js" file.
     * string - it will use the provided string as the "configFile" file path.
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
        build.initialOptions.metafile = true;

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
                resolveNamespace: resolveNamespaceNode,
                resolveModule: configFromFile?.config?.defaultConfig?.resolveModule,
            },
            build
        );

        const stylable = new Stylable(stConfig);

        build.onStart(() => {
            stylable.initCache();
        });

        build.onResolve({ filter: /\.st\.css$/ }, (args) => {
            if (args.path === args.importer && args.namespace === namespaces.jsModule) {
                return {
                    path: args.path,
                    pluginData: args.pluginData,
                    namespace: namespaces.css,
                };
            }

            return {
                path: stylable.resolvePath(args.resolveDir, args.path),
                namespace: namespaces.jsModule,
            };
        });

        build.onResolve({ filter: /\.css$/, namespace: namespaces.jsModule }, (args) => {
            return {
                path: stylable.resolvePath(
                    args.resolveDir,
                    args.path.replace(namespaces.nativeCss + `:`, '')
                ),
                namespace: cssInjection === 'css' ? namespaces.nativeCss : namespaces.jsModule,
            };
        });

        build.onLoad({ filter: /.*/, namespace: namespaces.nativeCss }, (args) => {
            const res = stylable.transform(args.path);
            const cssDepth = res.meta.transformCssDepth!.cssDepth;
            return {
                resolveDir: '.',
                contents: wrapWithDepthMarkers(res.meta.targetAst!.toString(), cssDepth),
                loader: 'css',
            };
        });

        build.onLoad({ filter: /.*/, namespace: namespaces.jsModule }, (args) => {
            const res = stylable.transform(args.path);
            const { cssDepth = 0, deepDependencies } = res.meta.transformCssDepth!;
            const imports = [];
            const unusedImports = [];
            collectImportsWithSideEffects(
                stylable,
                res.meta,
                (contextMeta, absPath, hasSideEffects) => {
                    if (hasSideEffects) {
                        if (!absPath.endsWith('.st.css')) {
                            imports.push({ from: namespaces.nativeCss + `:` + absPath });
                        } else {
                            imports.push({ from: absPath });
                        }
                    } else if (contextMeta === res.meta) {
                        unusedImports.push(absPath);
                    }
                }
            );

            if (cssInjection === 'css') {
                imports.push({
                    from: args.path,
                });
            }

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

            const assetsHeader =
                cssInjection === 'js'
                    ? processUrlDependencies({
                          meta: res.meta,
                          rootContext: stylable.projectRoot,
                          host: {
                              isAbsolute,
                              join,
                          },
                          getReplacement: ({ index }) => `http://__stylable_url_asset_${index}__`,
                      }).map((url, i) => `import __css_asset_${i}__ from ${JSON.stringify(url)};`)
                    : [];

            const moduleCode = generateStylableJSModuleSource(
                {
                    header: assetsHeader.join('\n'),
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

            const finalCode =
                cssInjection === 'js'
                    ? moduleCode.replace(
                          /\\"http:\/\/__stylable_url_asset_(.*?)__\\"/g,
                          (_$0, $1) => `" + JSON.stringify(__css_asset_${Number($1)}__) + "`
                      )
                    : moduleCode;

            const { errors, warnings } = esbuildEmitDiagnostics(res, diagnosticsMode);

            return {
                errors,
                warnings,
                watchFiles: [...deepDependencies],
                resolveDir: '.',
                contents: finalCode,
                pluginData: { stylableResults: res },
            };
        });

        build.onLoad({ filter: /.*/, namespace: namespaces.css }, (args) => {
            const { meta } = args.pluginData.stylableResults as StylableResults;
            const { cssDepth = 0 } = meta.transformCssDepth!;
            return {
                resolveDir: '.',
                contents: wrapWithDepthMarkers(meta.targetAst!.toString(), cssDepth),
                loader: 'css',
            };
        });

        build.onEnd(({ metafile }) => {
            if (cssInjection === 'css') {
                if (!metafile) {
                    throw new Error('metafile is required for css injection');
                }

                const usageMapping = optimize.removeUnusedComponents
                    ? buildUsageMapping(metafile, stylable)
                    : {};

                for (const distFile of Object.keys(metafile.outputs)) {
                    if (distFile.endsWith('.css')) {
                        const distFilePath = join(stylable.projectRoot, distFile);

                        writeFileSync(
                            distFilePath,
                            sortMarkersByDepth(
                                readFileSync(distFilePath, 'utf8'),
                                stylable,
                                usageMapping
                            )
                        );
                    }
                }
            }
        });
    },
});

function buildUsageMapping(metafile: Metafile, stylable: Stylable) {
    const usageMapping: Record<string, boolean> = {};
    for (const [key] of Object.entries(metafile.inputs)) {
        if (key.startsWith(namespaces.jsModule)) {
            const meta =
                stylable.fileProcessor.cache[key.replace(namespaces.jsModule + ':', '')].value;
            if (!meta) {
                throw new Error('meta not found');
            }
            usageMapping[meta.source] = true;
        }
    }
    return usageMapping;
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
        configFile: false,
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

function sortMarkersByDepth(
    css: string,
    stylable: Stylable,
    usageMapping?: Record<string, boolean>
) {
    const extracted: { depth: number; css: string }[] = [];
    const leftOverCss = css.replace(
        /(\/\* stylable-?\w*?-css:[\s\S]*?\*\/[\s\S]*?)?\[stylable-depth\][\s\S]*?\{[\s\S]*?--depth:[\s\S]*?(\d+)[\s\S]*?\}([\s\S]*?)\[stylable-depth\][\s\S]*?\{[\s\S]*?--end:[\s\S]*?\d+[\s\S]*?\}/g,
        (...args) => {
            const { 1: esbuildComment, 2: depth, 3: css } = args;
            extracted.push({ depth: parseInt(depth, 10), css: (esbuildComment || '') + css });
            return '';
        }
    );

    const sorted = sortModulesByDepth(
        extracted,
        (m) => m.depth,
        () => /*TODO: should we sort by id like in webpack? */ '',
        -1
    );

    return (
        leftOverCss.trimStart() +
        sorted
            .map((m) =>
                usageMapping ? removeUnusedComponents(m.css, stylable, usageMapping) : m.css
            )
            .join('')
    );
}

function removeUnusedComponents(
    css: string,
    stylable: Stylable,
    usageMapping: Record<string, boolean>
) {
    const ast = parse(css);
    stylable.optimizer?.optimizeAst(
        { removeUnusedComponents: true },
        ast,
        usageMapping,
        {
            classes: {},
            containers: {},
            keyframes: {},
            vars: {},
            layers: {},
            stVars: {},
        },
        { global: true } // TODO: handle globals!!!!! get usage from meta
    );
    return ast.toString();
}
