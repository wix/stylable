import webpack from 'webpack';
import { ShallowPartial, StylableWebpackPluginOptions } from './types';

export function normalizeOptions(
    options: ShallowPartial<StylableWebpackPluginOptions>,
    mode: webpack.Configuration['mode']
): StylableWebpackPluginOptions {
    const isProd = mode === 'production';
    const defaults: StylableWebpackPluginOptions = {
        requireModule: (id: string) => {
            delete require.cache[id];
            return require(id);
        },
        transformHooks: undefined,
        resolveNamespace: undefined,
        createRuntimeChunk: false,
        filename: '[name].bundle.css',
        outputCSS: isProd,
        includeCSSInJS: !isProd,
        useWeakDeps: true,
        bootstrap: {
            autoInit: true,
            getAutoInitModule: undefined,
            ...options.bootstrap
        },
        generate: {
            afterTransform: null,
            ...options.generate
        },
        optimizeStylableModulesPerChunks: true,
        optimizer: undefined,
        optimize: {
            removeUnusedComponents: true,
            removeComments: isProd,
            removeStylableDirectives: true,
            classNameOptimizations: isProd,
            shortNamespaces: isProd,
            removeEmptyNodes: isProd,
            minify: isProd,
            ...options.optimize
        },
        unsafeMuteDiagnostics: {
            DUPLICATE_MODULE_NAMESPACE: false,
            ...options.unsafeMuteDiagnostics
        },
        includeDynamicModulesInCSS: true,
        useEntryModuleInjection: false,
        experimentalHMR: false,
        plugins: []
    };

    return {
        ...defaults,
        ...options,
        optimize: defaults.optimize,
        bootstrap: defaults.bootstrap,
        generate: defaults.generate,
        unsafeMuteDiagnostics: defaults.unsafeMuteDiagnostics
    } as any;
}
