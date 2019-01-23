import { StylableWebpackPluginOptions } from './types';

export function normalizeOptions(
    options: StylableWebpackPluginOptions,
    mode: 'development' | 'production'
) {
    const isProd = mode === 'production';
    const defaults = {
        requireModule: (id: string) => {
            delete require.cache[id];
            return require(id);
        },
        transformHooks: undefined,
        resolveNamespace: undefined,
        createRuntimeChunk: false,
        filename: '[name].bundle.css',
        outputCSS: isProd ? true : false,
        includeCSSInJS: isProd ? false : true,
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
            removeComments: isProd ? true : false,
            removeStylableDirectives: true,
            classNameOptimizations: isProd ? true : false,
            shortNamespaces: isProd ? true : false,
            removeEmptyNodes: isProd ? true : false,
            minify: isProd ? true : false,
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
    };
}
