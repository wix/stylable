import postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import { SelectorAstNode } from './selector-utils';
import { getSourcePath } from './stylable-utils';
import { MappedStates, MixinValue, valueMapping } from './stylable-value-parsers';
export const RESERVED_ROOT_NAME = 'root';

export class StylableMeta {
    public rawAst: postcss.Root;
    public root: 'root';
    public source: string;
    public namespace: string;
    public imports: Imported[];
    public vars: VarSymbol[];
    public cssVars: Record<string, CSSVarSymbol>;
    public keyframes: postcss.AtRule[];
    public classes: Record<string, ClassSymbol>;
    public elements: Record<string, ElementSymbol>;
    public mappedSymbols: Record<string, StylableSymbol>;
    public customSelectors: Record<string, string>;
    public urls: string[];
    public parent?: StylableMeta;
    public transformDiagnostics: Diagnostics | null;
    public scopes: postcss.AtRule[];
    public simpleSelectors: Record<string, SimpleSelector>;
    // Generated during transform
    public outputAst?: postcss.Root;
    public globals: Record<string, boolean> = {};
    constructor(public ast: postcss.Root, public diagnostics: Diagnostics) {
        const rootSymbol: ClassSymbol = {
            _kind: 'class',
            name: RESERVED_ROOT_NAME,
            [valueMapping.root]: true
        };

        this.rawAst = ast.clone();
        this.source = getSourcePath(ast, diagnostics);
        this.root = RESERVED_ROOT_NAME;
        this.namespace = '';
        this.imports = [];
        this.vars = [];
        this.cssVars = {};
        this.keyframes = [];
        this.elements = {};
        this.classes = {
            [RESERVED_ROOT_NAME]: rootSymbol
        };
        this.mappedSymbols = {
            [RESERVED_ROOT_NAME]: rootSymbol
        };
        this.customSelectors = {};
        this.urls = [];
        this.scopes = [];
        this.simpleSelectors = {};
        this.transformDiagnostics = null;
    }
}

export interface Imported {
    from: string;
    defaultExport: string;
    named: Record<string, string>;
    rule: postcss.Rule;
    fromRelative: string;
    context: string;
}

export interface StylableDirectives {
    '-st-root'?: boolean;
    '-st-states'?: MappedStates;
    '-st-extends'?: ImportSymbol | ClassSymbol | ElementSymbol;
    '-st-global'?: SelectorAstNode[];
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

export interface CSSVarSymbol {
    _kind: 'cssVar';
    name: string;
    global?: boolean;
}

export type StylableSymbol = ImportSymbol | VarSymbol | ClassSymbol | ElementSymbol | CSSVarSymbol;

export interface RefedMixin {
    mixin: MixinValue;
    ref: ImportSymbol | ClassSymbol;
}

export interface SimpleSelector {
    symbol: ClassSymbol | ElementSymbol;
    node: postcss.Rule | postcss.Root;
}
