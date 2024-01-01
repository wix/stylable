import { join, isAbsolute } from 'path';
import decache from 'decache';
import type { PluginBuild, Metafile } from 'esbuild';
import type { Stylable, StylableConfig, StylableMeta, StylableResults } from '@stylable/core';
import type { ESBuildOptions } from './stylable-esbuild-plugin';
import { packageJsonLookupCache } from '@stylable/node';
import { sortModulesByDepth, processUrlDependencies } from '@stylable/build-tools';
import { DiagnosticsMode, emitDiagnostics } from '@stylable/core/dist/index-internal';
import { parse } from 'postcss';

export const namespaces = {
    unused: 'stylable-unused',
    jsModule: 'stylable-js-module',
    css: 'stylable-css',
    nativeCss: 'stylable-native-css',
};
export function lazyDebugPrint() {
    if (process.env.STYLABLE_DEBUG !== 'true') {
        return;
    }
    void Promise.resolve().then(() => {
        (globalThis as any).stylable_debug();
        (globalThis as any).stylable_debug_clear();
    });
}
export function debounce<T extends (...args: any[]) => void>(fn: T, time: number) {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>): void => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), time);
    };
}
export function clearCaches(stylable: Stylable) {
    packageJsonLookupCache.clear();
    stylable.initCache();
}
export function processAssetsStubs(moduleCode: string) {
    return moduleCode.replace(
        /\\"http:\/\/__stylable_url_asset_(.*?)__\\"/g,
        (_$0, $1) => `" + JSON.stringify(__css_asset_${Number($1)}__) + "`
    );
}
export function processAssetsAndApplyStubs(
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
export function importsCollector(res: StylableResults) {
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
export function enableEsbuildMetafile(build: PluginBuild, cssInjection: string) {
    if (cssInjection === 'css') {
        if (build.initialOptions.metafile === false) {
            console.warn(
                "'stylable-esbuild-plugin' requires the 'metafile' configuration option to be enabled for CSS injection. Since it appears to be disabled, we will automatically enable it for you. Please note that this is necessary for proper plugin functionality."
            );
        }
        build.initialOptions.metafile = true;
    }
}
export function buildUsageMapping(metafile: Metafile, stylable: Stylable): OptimizationMapping {
    const usageMapping: Record<string, boolean> = {};
    const globalMappings: Record<string, Record<string, boolean>> = {};
    const usagesByNamespace: Record<
        string,
        Set<{
            path: string;
            meta: StylableMeta;
        }>
    > = {};
    for (const [key] of Object.entries(metafile.inputs)) {
        if (key.startsWith(namespaces.jsModule)) {
            const path = key.replace(namespaces.jsModule + ':', '');
            const meta = stylable.fileProcessor.cache[path]?.value;
            if (!meta) {
                throw new Error(`build usage mapping failed: meta not found for ${key}`);
            }
            globalMappings[path] ||= {};
            Object.assign(globalMappings[path], meta.globals);
            usagesByNamespace[meta.namespace] ||= new Set();
            usagesByNamespace[meta.namespace].add({ path, meta });
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

    for (const [namespace, usage] of Object.entries(usagesByNamespace)) {
        if (usage.size > 1) {
            throw new Error(
                `The namespace '${namespace}' is being used in multiple files. Please review the following file(s) and update them to use a unique namespace:\n${[
                    ...usage,
                ]
                    .map((e) => e.path)
                    .join('\n')}`
            );
        }
    }
    return { usagesByNamespace, usageMapping, globalMappings };
}
export function esbuildEmitDiagnostics(res: StylableResults, diagnosticsMode: DiagnosticsMode) {
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
export function applyDefaultOptions(options: ESBuildOptions, prod = true) {
    const mode = options.mode ?? (prod ? 'production' : 'development');
    return {
        mode,
        cssInjection: mode === 'development' ? 'js' : 'css',
        diagnosticsMode: 'auto',
        stylableConfig: (config: StylableConfig) => config,
        configFile: true,
        runtimeStylesheetId: mode === 'production' ? 'namespace' : 'module+namespace',
        ...options,
        devTypes: {
            enabled: !!options.devTypes,
            srcDir: 'src',
            outDir: 'st-types',
            dtsSourceMap: true,
            ...options.devTypes,
        },
        optimize: {
            removeUnusedComponents: prod,
            ...options.optimize,
        },
    } satisfies ESBuildOptions;
}
export function createDecacheRequire(build: PluginBuild) {
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
export function wrapWithDepthMarkers(css: string, depth: number | string, pathId: number) {
    return `[stylable-start]{--depth:${depth}; --path: ${pathId};}${css}[stylable-end]{--path:${pathId}}`;
}
export interface OptimizationMapping {
    usageMapping?: Record<string, boolean>;
    globalMappings?: Record<string, Record<string, boolean>>;
    usagesByNamespace?: Record<
        string,
        Set<{
            path: string;
            meta: StylableMeta;
        }>
    >;
}
export function sortMarkersByDepth(
    css: string,
    stylable: Stylable,
    idForMap: IdForPath,
    { usageMapping, globalMappings }: OptimizationMapping
) {
    const extracted: { depth: number; css: string; path: string }[] = [];
    const leftOverCss = css.replace(
        /(\/\* stylable-?\w*?-css:[\s\S]*?\*\/[\s\S]*?)?\[stylable-start\][\s\S]*?\{[\s\S]*?--depth:[\s\S]*?(\d+)[\s]*;[\s\S]*?--path:[\s\S]*?(\d+)[\s\S]*?;?\}([\s\S]*?)\[stylable-end\][\s\S]*?\{[\s\S]*?--path:[\s\S]*?\d+[\s\S]*?\}/g,
        (...args) => {
            const { 1: esbuildComment, 2: depth, 3: pathId, 4: css } = args;
            extracted.push({
                depth: parseInt(depth, 10),
                css: (esbuildComment || '') + css,
                path: idForMap.getPath(parseInt(pathId, 10)) || '',
            });
            return '';
        }
    );

    const sorted = sortModulesByDepth(
        extracted,
        (m) => m.depth,
        (_) => '',
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

export class IdForPath {
    private idToPath = new Map<number, string>();
    private pathToId = new Map<string, number>();
    getId(path: string) {
        if (!this.pathToId.has(path)) {
            const id = this.pathToId.size;
            this.pathToId.set(path, id);
            this.idToPath.set(id, path);
        }
        return this.pathToId.get(path)!;
    }
    getPath(id: number) {
        return this.idToPath.get(id);
    }
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
