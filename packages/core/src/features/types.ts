import type { ClassSymbol } from './css-class';
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

export interface ElementSymbol extends StylableDirectives {
    _kind: 'element';
    name: string;
    alias?: ImportSymbol;
}

export interface ImportSymbol {
    _kind: 'import';
    type: 'named' | 'default';
    name: string;
    import: Imported;
    context: string;
}

export interface Imported {
    from: string;
    defaultExport: string;
    named: Record<string, string>;
    keyframes: Record<string, string>;
    rule: postcss.Rule | postcss.AtRule;
    request: string;
    context: string;
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
