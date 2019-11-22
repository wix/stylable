import { Stylable, StylableMeta, StylableResults, TransformHooks } from '@stylable/core';
import { StylableOptimizer } from '@stylable/optimizer';
import webpack from 'webpack';

export interface StylableWebpackPluginOptions {
    legacyRuntime: boolean;
    filename: string;
    useWeakDeps: boolean;
    includeDynamicModulesInCSS: boolean;
    createRuntimeChunk: boolean;
    outputCSS: boolean;
    includeCSSInJS: boolean;
    useEntryModuleInjection: boolean;
    transformHooks?: TransformHooks;
    experimentalHMR: boolean;
    runtimeMode: 'isolated' | 'shared' | 'external';
    globalRuntimeId: string;
    bootstrap: {
        autoInit: boolean;
        getAutoInitModule?: any;
        globalInjection?: (p: string) => string;
    };
    generate: {
        runtimeStylesheetId: 'module' | 'namespace';
        afterTransform: any;
    };
    optimizer?: StylableOptimizer;
    optimizeStylableModulesPerChunks: boolean;
    optimize: {
        removeUnusedComponents: boolean;
        removeComments: boolean;
        removeStylableDirectives: boolean;
        classNameOptimizations: boolean;
        shortNamespaces: boolean;
        removeEmptyNodes: boolean;
        minify: boolean;
    };
    unsafeMuteDiagnostics: {
        DUPLICATE_MODULE_NAMESPACE: boolean;
    };
    unsafeBuildNamespace?: boolean;
    afterTransform?:
        | ((results: StylableResults, module: StylableModule, stylable: Stylable) => void)
        | null;
    plugins?: Array<{ apply: (compiler: webpack.Compiler, stylablePlugin: any) => void }>;
    resolveNamespace?(): string;
    requireModule(path: string): any;
}

export interface StylableGeneratorOptions {
    includeCSSInJS: boolean;
    experimentalHMR: boolean;
    runtimeStylesheetId: 'module' | 'namespace';
    afterTransform: any;
}

export type ShallowPartial<T> = {
    [P in keyof T]?: T[P] extends new () => any ? T[P] : Partial<T[P]>;
};

export interface CalcResult {
    depth: number;
    cssDependencies: StylableModule[];
}

export interface StylableModule extends webpack.compilation.Module {
    context: string;
    dependencies?: StylableModule[];
    module?: StylableModule;
    resource: string;
    reasons: Array<{ module: StylableModule }>;
    request: string;
    loaders: webpack.NewLoader[];
    buildInfo: {
        optimize: StylableWebpackPluginOptions['optimize'];
        isImportedByNonStylable: boolean;
        runtimeInfo: CalcResult;
        stylableMeta: StylableMeta;
        usageMapping: Record<string, boolean>;
        usedStylableModules: StylableModule[];
    };
    originalSource(): string;
}
