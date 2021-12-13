import type { ImportSymbol, Imported } from './st-import';
import type { ClassSymbol } from './css-class';
import type { ElementSymbol } from './css-type';
import type { MappedStates, MixinValue } from '../stylable-value-parsers';
import type { SelectorNode } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';

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

export interface VarSymbol {
    _kind: 'var';
    name: string;
    value: string;
    text: string;
    valueType: string | null;
    node: postcss.Node;
}

export interface KeyframesSymbol {
    _kind: 'keyframes';
    alias: string;
    name: string;
    import?: Imported;
    global?: boolean;
}

export interface CSSVarSymbol {
    _kind: 'cssVar';
    name: string;
    global: boolean;
}
