import webpack from 'webpack';

export interface StylableWebpackPluginOptions {
    bootstrap: {
        autoInit: boolean,
        getAutoInitModule: any;
    };
    generate: {
        afterTransform: any;
    };
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
    }
}

export interface CalcResult {
    depth: number;
    cssDependencies: StylableModule[];
}

export interface StylableModule extends webpack.Module {
    buildInfo: {
        isImportedByNonStylable: boolean;
        runtimeInfo: CalcResult;
    };
    dependencies?: StylableModule[];
    module?: StylableModule;
    resource: string;
    reasons: Array<{ module: StylableModule }>;
    type: string;
    loaders: webpack.NewLoader[];
}
