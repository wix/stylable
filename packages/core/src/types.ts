import postcss from 'postcss';
import { StylableMeta } from './stylable-meta';
import { StylableResults } from './stylable-transformer';

export type PartialObject<T> = Partial<T> & object;
export type CSSObject = any & object;

export interface ParsedValue {
    type: string;
    value: string;
    nodes?: any;
    resolvedValue?: string;
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

export interface IStylableOptimizer {
    classNameOptimizer: IStylableClassNameOptimizer;
    namespaceOptimizer: IStylableNamespaceOptimizer;
    minifyCSS(css: string): string;
    optimize(
        config: object,
        stylableResult: StylableResults,
        usageMapping: Record<string, boolean>,
        delimiter?: string
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
