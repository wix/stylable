import type * as postcss from 'postcss';
import type { FeatureContext } from './features';
import type { Diagnostics } from './diagnostics';
import type { SelectorList } from '@tokey/css-selector-parser';
import type { PlugableRecord } from './helpers/plugable-record';
import { getSourcePath } from './stylable-utils';
import {
    STSymbol,
    STImport,
    STNamespace,
    STGlobal,
    STScope,
    STVar,
    STCustomSelector,
    STCustomState,
    STMixin,
    CSSClass,
    CSSType,
    CSSCustomProperty,
    CSSKeyframes,
    CSSLayer,
} from './features';

const features = [
    STSymbol,
    STImport,
    STNamespace,
    STGlobal,
    STScope,
    STVar,
    STCustomSelector,
    STCustomState,
    STMixin,
    CSSClass,
    CSSType,
    CSSCustomProperty,
    CSSKeyframes,
    CSSLayer,
];

export class StylableMeta {
    public data: PlugableRecord = {};
    public root = 'root';
    public source: string = getSourcePath(this.sourceAst, this.diagnostics);
    public namespace = '';
    public urls: string[] = [];
    public transformDiagnostics: Diagnostics | null = null;
    public transformedScopes: Record<string, SelectorList> | null = null;
    /** @deprecated */
    public scopes: postcss.AtRule[] = [];
    // Generated during transform
    public targetAst?: postcss.Root;
    public globals: Record<string, boolean> = {};
    constructor(public sourceAst: postcss.Root, public diagnostics: Diagnostics) {
        // initiate features
        const context: FeatureContext = { meta: this, diagnostics };
        for (const { hooks } of features) {
            hooks.metaInit(context);
        }
        // set default root
        const rootSymbol = CSSClass.addClass(context, 'root');
        rootSymbol[`-st-root`] = true;
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
    getImportStatements() {
        return STImport.getImportStatements(this);
    }
    getStVar(name: string) {
        return STSymbol.get(this, name, `var`);
    }
    getAllStVars() {
        return STSymbol.getAllByType(this, `var`);
    }
}
