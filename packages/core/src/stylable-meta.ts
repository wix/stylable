import * as postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import { SelectorAstNode } from './selector-utils';
import { getSourcePath } from './stylable-utils';
import { MappedStates, MixinValue, valueMapping } from './stylable-value-parsers';
import { Pojo } from './types';
export const RESERVED_ROOT_NAME = 'root';

export class StylableMeta {
    public rawAst: postcss.Root;
    public root: 'root';
    public source: string;
    public namespace: string;
    public imports: Imported[];
    public vars: VarSymbol[];
    public keyframes: postcss.AtRule[];
    public classes: Pojo<ClassSymbol>;
    public elements: Pojo<ElementSymbol>;
    public mappedSymbols: Pojo<StylableSymbol>;
    public customSelectors: Pojo<string>;
    public urls: string[];
    public outputAst?: postcss.Root;
    public parent?: StylableMeta;
    public transformDiagnostics: Diagnostics | null;
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
        this.transformDiagnostics = null;
    }
}

export interface Imported {
    from: string;
    defaultExport: string;
    named: Pojo<string>;
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

export type StylableSymbol = ImportSymbol | VarSymbol | ClassSymbol | ElementSymbol;

export interface RefedMixin {
    mixin: MixinValue;
    ref: ImportSymbol | ClassSymbol;
}
