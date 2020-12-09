import { Stylable, StylableExports } from '@stylable/core';
import { Chunk, Compilation, Compiler, Dependency } from 'webpack';
import type { LoaderContext } from '@stylable/webpack-plugin';

export interface StylableBuildMeta {
    css: string;
    exports: StylableExports;
    urls: string[];
    // stylableImports: { request: string; hasOwnSideEffects: boolean }[];
    depth: number;
    cssDepth: number;
    cssInjection: 'js' | 'css' | 'mini-css' | 'none';
    namespace: string;
    isUsed: undefined | boolean;
    globals: Record<string, boolean>;
    unusedImports: string[];
}

export type LoaderData = Pick<
    StylableBuildMeta,
    'css' | 'urls' | 'cssDepth' | 'exports' | 'namespace' | 'globals' | 'unusedImports'
>;

export interface StylableLoaderContext extends LoaderContext {
    resourcePath: string;
    stylable: Stylable;
    assetsMode: 'loader' | 'url';
    diagnosticsMode: 'auto' | 'strict' | 'loose';

    flagStylableModule: (loaderData: LoaderData) => void;
}

/* webpack missing types */
export type webpackCreateHash = Compiler['webpack']['util']['createHash'];
export type RuntimeTemplate = Compilation['runtimeTemplate'];
export type webpackOutputOptions = RuntimeTemplate['outputOptions'];
export type CompilationParams = Parameters<Compiler['newCompilation']>[0];
export type NormalModuleFactory = CompilationParams['normalModuleFactory'];
export type DependencyClass = new () => Dependency;
export type StringSortableSet = Chunk['idNameHints'];
export type DependencyTemplates = Compilation['dependencyTemplates'];
