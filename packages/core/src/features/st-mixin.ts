import { createFeature } from './feature';
import type { ImportSymbol } from './st-import';
import type { ClassSymbol } from './css-class';
import type * as postcss from 'postcss';
import type { FunctionNode, WordNode } from 'postcss-value-parser';

export interface MixinValue {
    type: string;
    options: Array<{ value: string }> | Record<string, string>;
    partial?: boolean;
    valueNode?: FunctionNode | WordNode;
    originDecl?: postcss.Declaration;
}

export interface RefedMixin {
    mixin: MixinValue;
    ref: ImportSymbol | ClassSymbol;
}

export const diagnostics = {};

// HOOKS

export const hooks = createFeature({});
