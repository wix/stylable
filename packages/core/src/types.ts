import * as postcss from 'postcss';
import { StylableMeta } from './stylable-meta';
import { StylableResults } from './stylable-transformer';

export type Pojo<T = any> = { [key: string]: T } & object;
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
        delimiter?: string,
        usageMapping?: Pojo<boolean>
    ): void;
    removeStylableDirectives(root: postcss.Root, shouldComment: boolean): void;
}

export interface IStylableClassNameOptimizer {
    context: {
        names: Pojo<string>
    };
    rewriteSelector(selector: string, namespace: string, globals: Pojo<boolean>): string;
    generateName(name: string): string;
    optimizeAstAndExports(
        ast: postcss.Root,
        exported: Pojo<string>,
        classes: string[],
        namespace: string,
        globals?: Pojo<boolean>
    ): void;
}

export interface IStylableNamespaceOptimizer {
    index: number;
    namespacePrefix: string;
    namespaceMapping: Pojo<string>;
    getNamespace(meta: StylableMeta, ..._env: any[]): string;
}
