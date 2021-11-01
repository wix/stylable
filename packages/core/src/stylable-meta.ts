import type * as postcss from 'postcss';
import type {
    CSSVarSymbol,
    ClassSymbol,
    ElementSymbol,
    Imported,
    KeyframesSymbol,
    RefedMixin,
    SimpleSelector,
    StylableSymbol,
    VarSymbol,
} from './features';
import type { Diagnostics } from './diagnostics';
import type { SelectorList } from '@tokey/css-selector-parser';
import { getSourcePath } from './stylable-utils';
import { setFieldForDeprecation } from './helpers/deprecation';
import { valueMapping } from './stylable-value-parsers';

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
    public mappedKeyframes: Record<string, KeyframesSymbol>;
    public customSelectors: Record<string, string>;
    public urls: string[];
    public parent?: StylableMeta;
    public transformDiagnostics: Diagnostics | null;
    public transformedScopes: Record<string, SelectorList> | null;
    public scopes: postcss.AtRule[];
    public simpleSelectors: Record<string, SimpleSelector>;
    public mixins: RefedMixin[];
    // Generated during transform
    public outputAst?: postcss.Root;
    public globals: Record<string, boolean> = {};
    constructor(public ast: postcss.Root, public diagnostics: Diagnostics) {
        const rootSymbol: ClassSymbol = {
            _kind: 'class',
            name: RESERVED_ROOT_NAME,
            [valueMapping.root]: true,
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
            [RESERVED_ROOT_NAME]: rootSymbol,
        };
        this.mappedSymbols = {
            [RESERVED_ROOT_NAME]: rootSymbol,
        };
        this.mappedKeyframes = {};
        this.customSelectors = {};
        this.urls = [];
        this.scopes = [];
        this.simpleSelectors = {};
        setFieldForDeprecation(this, `mixins`, { objectType: `stylableMeta` });
        this.mixins = [];
        this.transformDiagnostics = null;
        this.transformedScopes = null;
    }
}
