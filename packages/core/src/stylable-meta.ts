import type * as postcss from 'postcss';
import type { FeatureContext } from './features';
import type { Diagnostics } from './diagnostics';
import type { SelectorList } from '@tokey/css-selector-parser';
import type { PlugableRecord } from './helpers/plugable-record';
import type { StylableExports } from './stylable-transformer';
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
    CSSPseudoClass,
    CSSCustomProperty,
    CSSKeyframes,
    CSSLayer,
    CSSContains,
    STStructure,
} from './features';
import type { FeatureFlags } from './features/feature';

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
    CSSPseudoClass,
    CSSCustomProperty,
    CSSKeyframes,
    CSSLayer,
    CSSContains,
    STStructure,
];

export class StylableMeta {
    public exports?: StylableExports;
    public data: PlugableRecord = {};
    public root = '';
    public source: string = getSourcePath(this.sourceAst, this.diagnostics);
    public type: 'stylable' | 'css' = this.source.endsWith('.st.css') ? 'stylable' : 'css';
    public namespace = '';
    public urls: string[] = [];
    public transformCssDepth: { cssDepth: number; deepDependencies: Set<string> } | undefined;
    public transformDiagnostics: Diagnostics | null = null;
    public transformedScopes: Record<string, SelectorList> | null = null;
    /** @deprecated */
    public scopes: postcss.AtRule[] = [];
    // Generated during transform
    public targetAst?: postcss.Root;
    public globals: Record<string, boolean> = {};
    constructor(
        public sourceAst: postcss.Root,
        public diagnostics: Diagnostics,
        public flags: FeatureFlags
    ) {
        // initiate features
        const context: FeatureContext = { meta: this, diagnostics };
        for (const { hooks } of features) {
            hooks.metaInit(context);
        }
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
