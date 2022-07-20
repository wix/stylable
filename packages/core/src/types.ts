import type * as postcss from 'postcss';
import type { Box } from './custom-values';

export type RuntimeStVar = string | { [key: string]: RuntimeStVar } | RuntimeStVar[];

export interface StylableExports {
    classes: Record<string, string>;
    vars: Record<string, string>;
    stVars: Record<string, RuntimeStVar>;
    keyframes: Record<string, string>;
    layers: Record<string, string>;
}

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
        targetAst: postcss.Root,
        usageMapping: Record<string, boolean>,
        jsExports: StylableExports,
        globals: Record<string, boolean>
    ): void;
    getNamespace(namespace: string): string;
    getClassName(className: string): string;
    removeStylableDirectives(root: postcss.Root, shouldComment?: boolean): void;
}

export type ModuleResolver = (directoryPath: string, request: string) => string;
