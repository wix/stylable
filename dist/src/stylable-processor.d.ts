import * as postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import { SelectorAstNode } from './selector-utils';
import { MixinValue } from './stylable-value-parsers';
import { Pojo } from './types';
export declare function createEmptyMeta(root: postcss.Root, diagnostics: Diagnostics): StylableMeta;
export declare function getSourcePath(root: postcss.Root, diagnostics: Diagnostics): string;
export declare function processNamespace(namespace: string, source: string): string;
export declare function process(root: postcss.Root, diagnostics?: Diagnostics): StylableMeta;
export declare class StylableProcessor {
    protected diagnostics: Diagnostics;
    protected meta: StylableMeta;
    constructor(diagnostics?: Diagnostics);
    process(root: postcss.Root): StylableMeta;
    insertCustomSelectorsStubs(): (postcss.Rule | null)[];
    handleCustomSelectors(rule: postcss.Rule): void;
    protected handleAtRules(root: postcss.Root): void;
    protected handleRule(rule: SRule): void;
    protected checkRedeclareSymbol(symbolName: string, node: postcss.Node): void;
    protected addElementSymbolOnce(name: string, rule: postcss.Rule): void;
    protected addClassSymbolOnce(name: string, rule: postcss.Rule): void;
    protected addImportSymbols(importDef: Imported): void;
    protected addVarSymbols(rule: postcss.Rule): void;
    protected handleDeclarations(rule: SRule): void;
    protected handleDirectives(rule: SRule, decl: postcss.Declaration): void;
    protected setClassGlobalMapping(decl: postcss.Declaration, rule: postcss.Rule): void;
    protected extendTypedRule(node: postcss.Node, selector: string, key: keyof StylableDirectives, value: any): void;
    protected handleImport(rule: postcss.Rule): Imported;
}
export interface Imported {
    from: string;
    defaultExport: string;
    named: Pojo<string>;
    overrides: postcss.Declaration[];
    theme: boolean;
    rule: postcss.Rule;
    fromRelative: string;
}
export interface StylableDirectives {
    '-st-root'?: boolean;
    '-st-compose'?: Array<ImportSymbol | ClassSymbol>;
    '-st-states'?: any;
    '-st-extends'?: ImportSymbol | ClassSymbol;
    '-st-theme'?: boolean;
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
}
export interface VarSymbol {
    _kind: 'var';
    name: string;
    value: string;
    text: string;
    import: ImportSymbol | null;
    node: postcss.Node;
}
export declare type StylableSymbol = ImportSymbol | VarSymbol | ClassSymbol | ElementSymbol;
export interface StylableMeta {
    ast: postcss.Root;
    rawAst: postcss.Root;
    outputAst?: postcss.Root;
    root: 'root';
    source: string;
    namespace: string;
    imports: Imported[];
    vars: VarSymbol[];
    keyframes: postcss.AtRule[];
    classes: Pojo<ClassSymbol>;
    elements: Pojo<ElementSymbol>;
    mappedSymbols: Pojo<StylableSymbol>;
    customSelectors: Pojo<string>;
    diagnostics: Diagnostics;
    transformDiagnostics: Diagnostics | null;
}
export interface RefedMixin {
    mixin: MixinValue;
    ref: ImportSymbol | ClassSymbol;
}
export interface SRule extends postcss.Rule {
    selectorAst: SelectorAstNode;
    isSimpleSelector: boolean;
    selectorType: 'class' | 'element' | 'complex';
    mixins?: RefedMixin[];
}
export interface SAtRule extends postcss.AtRule {
    sourceParams: string;
}
export interface SDecl extends postcss.Declaration {
    sourceValue: string;
}
