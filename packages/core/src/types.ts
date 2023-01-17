import type * as postcss from 'postcss';
import type { Box } from './custom-values';
import type { StylableExports, StylableResults } from './stylable-transformer';

export interface ParsedValue {
    type: string;
    value: string;
    nodes?: any;
    resolvedValue?: string | Box<string, unknown>;
    url?: string;
}

export interface OptimizeConfig {
    removeComments?: boolean;
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
        usageMapping: Record<string, boolean>
    ): void;
    getNamespace(namespace: string): string;
    getClassName(className: string): string;
    optimizeAst(
        config: OptimizeConfig,
        targetAst: postcss.Root,
        usageMapping: Record<string, boolean>,
        jsExports: StylableExports,
        globals: Record<string, boolean>
    ): void;
}

export type ModuleResolver = (directoryPath: string, request: string) => string;
