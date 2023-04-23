import type { Plugin, PluginBuild } from 'esbuild';
import { Stylable, StylableResults } from '@stylable/core';
import { resolveNamespace } from '@stylable/node';
import decache from 'decache';
import fs, { readFileSync, writeFileSync } from 'fs';
import { generateStylableJSModuleSource } from '@stylable/module-utils';
import { sortModulesByDepth, collectImportsWithSideEffects } from '@stylable/build-tools';
import { relative, join } from 'path';

const namespaces = {
    jsModule: 'stylable-js-module',
    css: 'stylable-css',
    nativeCss: 'stylable-native-css',
};

interface ESBuildOptions {
    cssInjection?: 'js' | 'css';
    resolveNamespace?: typeof resolveNamespace;
    uniqueBuildName?: string;
}

export const stylablePlugin = (options: ESBuildOptions = {}): Plugin => ({
    name: 'esbuild-stylable-plugin',
    setup(build: PluginBuild) {
        build.initialOptions.metafile = true;

        const requireModule = createDecacheRequire(build);
        const projectRoot = build.initialOptions.absWorkingDir || process.cwd();
        const stylable = new Stylable({
            fileSystem: fs,
            projectRoot,
            requireModule,
            resolveNamespace: options.resolveNamespace || resolveNamespace,
        });

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

        /** NATIVE CSS */
        build.onResolve({ filter: /\.css$/, namespace: namespaces.jsModule }, (args) => {
            return {
                path: stylable.resolvePath(
                    args.resolveDir,
                    args.path.replace(namespaces.nativeCss + `:`, '')
                ),
                namespace:
                    options.cssInjection === 'css' ? namespaces.nativeCss : namespaces.jsModule,
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
        /** NATIVE CSS END */

        build.onLoad({ filter: /.*/, namespace: namespaces.jsModule }, (args) => {
            const res = stylable.transform(args.path);
            const { cssDepth = 0, deepDependencies } = res.meta.transformCssDepth!;
            const imports = [];

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
                        // TODO
                        // unusedImports.push(absPath);
                    }
                }
            );

            if (options.cssInjection === 'css') {
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
                options.cssInjection === 'js'
                    ? {
                          css: res.meta.targetAst!.toString(),
                          depth: cssDepth,
                          runtimeId: 'esbuild-stylable-plugin',
                          id: relative(projectRoot, args.path),
                      }
                    : undefined
            );
            return {
                watchFiles: [...deepDependencies],
                resolveDir: '.',
                contents: moduleCode,
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
            if (options.cssInjection === 'css') {
                if (!metafile) {
                    throw new Error('metafile is required for css injection');
                }
                for (const path of Object.keys(metafile.outputs)) {
                    if (path.endsWith('.css')) {
                        const p = join(projectRoot, path);
                        const cssbundle = readFileSync(p, 'utf8');
                        writeFileSync(p, extractMarkers(cssbundle));
                    }
                }
            }
        });
    },
});

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

function extractMarkers(css: string) {
    const extracted: { depth: number; css: string }[] = [];
    const leftOverCss = css.replace(
        /(\/\* stylable-css:[\s\S]*?\*\/[\s\S]*?)?\[stylable-depth\][\s\S]*?\{[\s\S]*?--depth:[\s\S]*?(\d+)[\s\S]*?\}([\s\S]*?)\[stylable-depth\][\s\S]*?\{[\s\S]*?--end:[\s\S]*?\d+[\s\S]*?\}/g,
        (...args) => {
            const { 1: esbuildComment, 2: depth, 3: css } = args;
            extracted.push({ depth: parseInt(depth, 10), css: (esbuildComment || '') + css });
            return '';
        }
    );

    const sorted = sortModulesByDepth(
        extracted,
        (m) => m.depth,
        () => /*TODO*/ '',
        -1
    );

    return leftOverCss.trimStart() + sorted.map((m) => m.css).join('');
}
