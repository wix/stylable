import type { MappedStates, MixinValue } from '../stylable-value-parsers';
import type { SelectorNode } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';

export interface Imported {
    from: string;
    defaultExport: string;
    named: Record<string, string>;
    keyframes: Record<string, string>;
    rule: postcss.Rule | postcss.AtRule;
    request: string;
    context: string;
}

export interface StylableDirectives {
    '-st-root'?: boolean;
    '-st-states'?: MappedStates;
    '-st-extends'?: ImportSymbol | ClassSymbol | ElementSymbol;
    '-st-global'?: SelectorNode[];
}

export interface ClassSymbol extends StylableDirectives {
    _kind: 'class';
    name: string;
    alias?: ImportSymbol;
    scoped?: string;
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

export type StylableSymbol =
    | ImportSymbol
    | VarSymbol
    | ClassSymbol
    | ElementSymbol
    | CSSVarSymbol
    | KeyframesSymbol;

export interface RefedMixin {
    mixin: MixinValue;
    ref: ImportSymbol | ClassSymbol;
}

export interface SimpleSelector {
    symbol: ClassSymbol | ElementSymbol;
    node: postcss.Rule | postcss.Root;
}
