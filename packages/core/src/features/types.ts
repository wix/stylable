import type { ImportSymbol } from './st-import';
import type { ClassSymbol } from './css-class';
import type { ElementSymbol } from './css-type';
import type { MappedStates, MixinValue } from '../stylable-value-parsers';
import type { SelectorNode } from '@tokey/css-selector-parser';

// ToDo: distribute types to features

export interface StylableDirectives {
    '-st-root'?: boolean;
    '-st-states'?: MappedStates;
    '-st-extends'?: ImportSymbol | ClassSymbol | ElementSymbol;
    '-st-global'?: SelectorNode[];
}

export interface RefedMixin {
    mixin: MixinValue;
    ref: ImportSymbol | ClassSymbol;
}
