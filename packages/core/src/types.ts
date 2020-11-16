import * as postcss from 'postcss';
import { Box } from './custom-values';
import { StylableMeta } from './stylable-meta';
import { StylableExports, StylableResults } from './stylable-transformer';

export type PartialObject<T> = Partial<T> & object;
export type CSSObject = any & object;

export interface ParsedValue {
    type: string;
    value: string;
    nodes?: any;
    resolvedValue?: string | Box<string, unknown>;
    url?: string;
}

export interface StateTypeValidator {
    name: string;
    args: string[];
}

export type StateArguments = Array<StateTypeValidator | string>;

export interface StateParsedValue {
    type: string;
    defaultValue?: string;
    arguments: StateArguments;
}

export interface OptimizeConfig {
    removeComments?: boolean;
    removeStylableDirectives?: boolean;
    removeUnusedComponents?: boolean;
    classNameOptimizations?: boolean;
    removeEmptyNodes?: boolean;
    shortNamespaces?: boolean;
}

export interface IStylableOptimizer {
    minifyCSS(css: string): string;
    optimize(
        config: OptimizeConfig,
        stylableResult: StylableResults,
        usageMapping: Record<string, boolean>,
        delimiter?: string
    ): void;
    getNamespace(namespace: string): string;
    optimizeAst(
        config: OptimizeConfig,
        outputAst: postcss.Root,
        usageMapping: Record<string, boolean>,
        delimiter: string | undefined,
        jsExports: StylableExports,
        globals: Record<string, boolean>
    ): void;
    removeStylableDirectives(root: postcss.Root, shouldComment: boolean): void;
}

export interface IStylableClassNameOptimizer {
    context: {
        names: Record<string, string>;
    };
    rewriteSelector(
        selector: string,
        usageMapping: Record<string, boolean>,
        globals: Record<string, boolean>
    ): string;
    generateName(name: string): string;
    optimizeAstAndExports(
        ast: postcss.Root,
        exported: Record<string, string>,
        classes: string[],
        usageMapping: Record<string, boolean>,
        globals?: Record<string, boolean>
    ): void;
}

export interface IStylableNamespaceOptimizer {
    index: number;
    namespacePrefix: string;
    namespaceMapping: Record<string, string>;
    getNamespace(meta: StylableMeta, ..._env: any[]): string;
}

export type ModuleResolver = (directoryPath: string, request: string) => string;
