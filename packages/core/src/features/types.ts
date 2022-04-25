import type { ImportSymbol } from './st-import';
import type { ClassSymbol } from './css-class';
import type { ElementSymbol } from './css-type';
import type { StateParsedValue } from '../types';
import type { SelectorNode } from '@tokey/css-selector-parser';

export interface MappedStates {
    [s: string]: StateParsedValue | string | null;
}

export interface StylableDirectives {
    '-st-root'?: boolean;
    '-st-states'?: MappedStates;
    '-st-extends'?: ImportSymbol | ClassSymbol | ElementSymbol;
    '-st-global'?: SelectorNode[];
}
