import { createFeature } from './feature';
import type { ImportSymbol } from './st-import';
import type { ClassSymbol } from './css-class';
// ToDo: extract
import type { MixinValue } from '../stylable-value-parsers';

export interface RefedMixin {
    mixin: MixinValue;
    ref: ImportSymbol | ClassSymbol;
}

export const diagnostics = {};

// HOOKS

export const hooks = createFeature({});
