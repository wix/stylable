import { Stylable } from '@stylable/core';
import { LoaderContext } from 'typings/webpack5';
import { Compilation, Compiler, Dependency } from 'webpack';

export interface StylableBuildMeta {
    css: string;
    urls: string[];
    cssDepth: number;
    cssInjection: 'js' | 'css' | 'mini-css';
    isUsed: undefined | boolean;
}

export type LoaderData = Pick<StylableBuildMeta, 'css' | 'urls'>;

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
