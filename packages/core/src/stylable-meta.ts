import type * as postcss from 'postcss';
import type {
    CSSVarSymbol,
    ClassSymbol,
    ElementSymbol,
    Imported,
    KeyframesSymbol,
    RefedMixin,
    StylableSymbol,
    VarSymbol,
} from './features';
import type { Diagnostics } from './diagnostics';
import type { SelectorList } from '@tokey/css-selector-parser';
import type { PlugableRecord } from './helpers/plugable-record';
import { getSourcePath } from './stylable-utils';
import { setFieldForDeprecation } from './helpers/deprecation';
import { valueMapping } from './stylable-value-parsers';
import { STSymbol, STGlobal, CSSClass, CSSType } from './features';

export const RESERVED_ROOT_NAME = 'root';

const features = [STSymbol, STGlobal, CSSClass, CSSType];

export class StylableMeta {
    public data: PlugableRecord = {};
    public rawAst: postcss.Root = this.ast.clone();
    public root: 'root' = RESERVED_ROOT_NAME;
    public source: string = getSourcePath(this.ast, this.diagnostics);
    public namespace = '';
    public imports: Imported[] = [];
    public vars: VarSymbol[] = [];
    public cssVars: Record<string, CSSVarSymbol> = {};
    public keyframes: postcss.AtRule[] = [];
    public classes: Record<string, ClassSymbol> = {};
    public elements: Record<string, ElementSymbol> = {};
    public mappedSymbols: Record<string, StylableSymbol> = {};
    public mappedKeyframes: Record<string, KeyframesSymbol> = {};
    public customSelectors: Record<string, string> = {};
    public urls: string[] = [];
    public parent?: StylableMeta;
    public transformDiagnostics: Diagnostics | null = null;
    public transformedScopes: Record<string, SelectorList> | null = null;
    public scopes: postcss.AtRule[] = [];
    public mixins: RefedMixin[];
    // Generated during transform
    public outputAst?: postcss.Root;
    public globals: Record<string, boolean> = {};
    constructor(public ast: postcss.Root, public diagnostics: Diagnostics) {
        // initiate features
        for (const { hooks } of features) {
            hooks.analyzeInit(this);
        }
        // set default root
        const rootSymbol = CSSClass.addClass(this, RESERVED_ROOT_NAME);
        rootSymbol[valueMapping.root] = true;

        setFieldForDeprecation(this, `mixins`, { objectType: `stylableMeta` });
        this.mixins = [];
    }
    getSymbol(name: string) {
        return STSymbol.get(this, name);
    }
    getAllSymbols() {
        return STSymbol.getAll(this);
    }
    getClass(name: string) {
        return CSSClass.get(this, name);
    }
    getAllClasses() {
        return CSSClass.getAll(this);
    }
    getTypeElement(name: string) {
        return CSSType.get(this, name);
    }
    getAllTypeElements() {
        return CSSType.getAll(this);
    }
}
setFieldForDeprecation(StylableMeta.prototype, `elements`, {
    objectType: `stylableMeta`,
    valueOnThis: true,
    pleaseUse: `meta.getAllTypeElements() or meta.getTypeElement(name)`,
});
setFieldForDeprecation(StylableMeta.prototype, `classes`, {
    objectType: `stylableMeta`,
    valueOnThis: true,
    pleaseUse: `meta.getAllClasses() or meta.getClass(name)`,
});
setFieldForDeprecation(StylableMeta.prototype, `mappedSymbols`, {
    objectType: `stylableMeta`,
    valueOnThis: true,
    pleaseUse: `meta.getAllSymbols() or meta.getSymbol(name)`,
});
