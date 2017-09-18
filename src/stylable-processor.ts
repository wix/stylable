import * as postcss from 'postcss';
import { parseSelector, traverseNode, SelectorAstNode, createSimpleSelectorChecker, createRootAfterSpaceChecker } from './selector-utils';
import * as path from 'path';
import { Diagnostics } from "./diagnostics";
import { filename2varname, stripQuotation } from "./utils";
import { valueMapping, SBTypesParsers, stValues, MixinValue } from "./stylable-value-parsers";
import { matchValue, valueReplacer } from "./value-template";
import { Pojo } from "./types";
const hash = require('murmurhash');

const parseNamed = SBTypesParsers[valueMapping.named];
const parseMixin = SBTypesParsers[valueMapping.mixin];
const parseStates = SBTypesParsers[valueMapping.states];
const parseCompose = SBTypesParsers[valueMapping.compose];
const parseTheme = SBTypesParsers[valueMapping.theme];


export function createEmptyMeta(root: postcss.Root, diagnostics: Diagnostics): StylableMeta {
    const reservedRootName = 'root';
    const rootSymbol: ClassSymbol = {
        _kind: 'class',
        name: reservedRootName,
        [valueMapping.root]: true
    };

    return {
        ast: root,
        rawAst: root.clone(),
        root: reservedRootName,
        source: getSourcePath(root, diagnostics),
        namespace: '',
        imports: [],
        vars: [],
        keyframes: [],
        elements: {},
        classes: {
            [reservedRootName]: rootSymbol
        },
        mappedSymbols: {
            [reservedRootName]: rootSymbol
        },
        diagnostics
    };

}


export function getSourcePath(root: postcss.Root, diagnostics: Diagnostics) {
    const source = root.source.input.file || '';
    if (!source) {
        diagnostics.error(root, 'missing source filename');
    } else if (!path.isAbsolute(source)) {
        throw new Error('source filename is not absolute path: "' + source + '"');
    }
    return source;
}


export function processNamespace(namespace: string, source: string) {
    return namespace + hash.v3(source)//.toString(36);
}

export function process(root: postcss.Root, diagnostics = new Diagnostics()) {
    return new StylableProcessor(diagnostics).process(root);
}

export class StylableProcessor {
    protected meta: StylableMeta;
    constructor(protected diagnostics = new Diagnostics()) { }
    public process(root: postcss.Root): StylableMeta {

        this.meta = createEmptyMeta(root, this.diagnostics);

        this.handleAtRules(root);

        root.walkRules((rule: SRule) => {
            this.handleRule(rule);
            this.handleDeclarations(rule);
        });

        return this.meta;

    }

    protected handleAtRules(root: postcss.Root) {
        let namespace = '';
        const toRemove: postcss.Node[] = [];
        root.walkAtRules((atRule) => {
            switch (atRule.name) {
                case 'namespace':
                    const match = atRule.params.match(/["'](.*?)['"]/);
                    match ? (namespace = match[1]) : this.diagnostics.error(atRule, 'invalid namespace');
                    toRemove.push(atRule)
                    break;
                case 'keyframes':
                    this.meta.keyframes.push(atRule);
                    break;
            }
        });
        toRemove.forEach(node => node.remove());
        namespace = namespace || filename2varname(path.basename(this.meta.source)) || 's';
        this.meta.namespace = processNamespace(namespace, this.meta.source);
    }

    protected handleRule(rule: SRule) {
        
        rule.selectorAst = parseSelector(rule.selector);

        const checker = createSimpleSelectorChecker();
        const isValidRootUsage = createRootAfterSpaceChecker();

        traverseNode(rule.selectorAst, (node, index, nodes) => {
            isValidRootUsage(node);
            if (!checker(node)) {
                rule.isSimpleSelector = false;
            }
            const { name, type } = node;
            if (type === 'pseudo-class') {
                if (name === 'import') {
                    if (rule.selector === ':import') {
                        const _import = this.handleImport(rule);
                        this.meta.imports.push(_import);
                        this.addImportSymbols(_import);
                        return false;
                    } else {
                        this.diagnostics.warn(rule, 'cannot define ":import" inside a complex selector');
                    }
                } else if (name === 'vars') {
                    if (rule.selector === ':vars') {
                        this.addVarSymbols(rule);
                        return false;
                    } else {
                        this.diagnostics.warn(rule, 'cannot define ":vars" inside a complex selector');
                    }
                }
            } else if (type === 'class') {
                this.addClassSymbolOnce(name, rule);
            } else if (type === 'element') {
                this.addElementSymbolOnce(name, rule);
                const prev = nodes[index - 1];
                if (prev) { /*TODO: maybe warn on element that is not a direct child div vs > div*/ }
            }
            return void 0;
        });

        if (rule.isSimpleSelector !== false) {
            rule.isSimpleSelector = true;
            rule.selectorType = rule.selector.match(/^\./) ? 'class' : 'element';
        } else {
            rule.selectorType = 'complex';
        };

        if (!isValidRootUsage()) {
            this.diagnostics.warn(rule, '.root class cannot be used after spacing');
        }

    }

    protected checkRedeclareSymbol(symbolName: string, node: postcss.Node) {
        const symbol = this.meta.mappedSymbols[symbolName];
        if (symbol) {
            //TODO: can output match better error;
            this.diagnostics.warn(node, `redeclare symbol "${symbolName}"`, { word: symbolName })
        }
    }

    protected addElementSymbolOnce(name: string, rule: postcss.Rule) {
        if (name.charAt(0).match(/[A-Z]/) && !this.meta.elements[name]) {
            let alias = <ImportSymbol | undefined>this.meta.mappedSymbols[name];
            if (alias && alias._kind !== 'import') {
                this.checkRedeclareSymbol(name, rule);
                alias = undefined;
            }
            this.meta.elements[name] = { _kind: "element", name, alias };
        }
    }

    protected addClassSymbolOnce(name: string, rule: postcss.Rule) {
        if (!this.meta.classes[name]) {
            let alias = <ImportSymbol | undefined>this.meta.mappedSymbols[name];
            if (alias && alias._kind !== 'import') {
                this.checkRedeclareSymbol(name, rule);
                alias = undefined;
            }
            this.meta.classes[name] = this.meta.mappedSymbols[name] = { _kind: "class", name, alias};
        }
    }

    protected addImportSymbols(importDef: Imported) {

        if (importDef.defaultExport) {
            this.checkRedeclareSymbol(importDef.defaultExport, importDef.rule);
            this.meta.mappedSymbols[importDef.defaultExport] = {
                _kind: 'import',
                type: 'default',
                name: 'default',
                import: importDef
            };
        }
        Object.keys(importDef.named).forEach((name) => {
            this.checkRedeclareSymbol(name, importDef.rule);
            this.meta.mappedSymbols[name] = {
                _kind: 'import',
                type: 'named',
                name: importDef.named[name],
                import: importDef
            };
        });
    }

    protected addVarSymbols(rule: postcss.Rule) {
        rule.walkDecls((decl) => {
            this.checkRedeclareSymbol(decl.prop, decl);
            let importSymbol = null;

            const value = valueReplacer(decl.value, {}, (value, name, match) => {
                value;
                const symbol = this.meta.mappedSymbols[name];
                if (!symbol) {
                    this.diagnostics.warn(decl, `cannot resolve variable value for "${name}"`, { word: match });
                    return match;
                } else if (symbol._kind === 'import') {
                    importSymbol = symbol;
                }
                return symbol._kind === 'var' ? symbol.value : match;
            });
            const varSymbol: VarSymbol = {
                _kind: 'var',
                name: decl.prop,
                value: value,
                text: decl.value,
                import: importSymbol,
                node: decl
            }
            this.meta.vars.push(varSymbol);
            this.meta.mappedSymbols[decl.prop] = varSymbol;
        });
        rule.remove();
    }

    protected handleDeclarations(rule: SRule) {
        rule.walkDecls(decl => {

            decl.value.replace(matchValue, (match, varName) => {
                if (match && !this.meta.mappedSymbols[varName]) {
                    this.diagnostics.warn(decl, `unknown var "${varName}"`, { word: varName });
                }
                return match;
            });

            if (stValues.indexOf(decl.prop) !== -1) {
                this.handleDirectives(rule, decl);
            }

        });

    }

    protected handleDirectives(rule: SRule, decl: postcss.Declaration) {
        if (decl.prop === valueMapping.states) {
            if (rule.isSimpleSelector) {
                this.extendTypedRule(
                    decl,
                    rule.selector,
                    valueMapping.states,
                    parseStates(decl.value)
                );
            } else {
                this.diagnostics.warn(decl, 'cannot define pseudo states inside complex selectors');
            }
        } else if (decl.prop === valueMapping.extends) {
            if (rule.isSimpleSelector) {
                const extendsRefSymbol = this.meta.mappedSymbols[decl.value];
                if (extendsRefSymbol && (extendsRefSymbol._kind === 'import' || extendsRefSymbol._kind === 'class') || decl.value === this.meta.root) {
                    this.extendTypedRule(
                        decl,
                        rule.selector,
                        valueMapping.extends,
                        extendsRefSymbol
                    );
                } else {
                    this.diagnostics.warn(decl, `cannot resolve "${valueMapping.extends}" type for "${decl.value}"`, { word: decl.value });
                }
            } else {
                this.diagnostics.warn(decl, 'cannot define "' + valueMapping.extends + '" inside a complex selector');
            }

        } else if (decl.prop === valueMapping.mixin) {
            const mixins: RefedMixin[] = [];
            parseMixin(decl.value).forEach((mixin) => {
                const mixinRefSymbol = this.meta.mappedSymbols[mixin.type];
                if (mixinRefSymbol && (mixinRefSymbol._kind === 'import' || mixinRefSymbol._kind === 'class')) {
                    mixins.push({
                        mixin,
                        ref: mixinRefSymbol,
                    });
                } else {
                    this.diagnostics.warn(decl, `unknown mixin: "${mixin.type}"`, { word: mixin.type });
                }
            });

            if (rule.mixins) {
                this.diagnostics.warn(decl, `override mixin on same rule`);
            }

            rule.mixins = mixins;
        } else if (decl.prop === valueMapping.compose) {
            const composes = parseCompose(decl.value);
            if (rule.isSimpleSelector) {
                const composeSymbols = composes.map((name) => {
                    const extendsRefSymbol = this.meta.mappedSymbols[name];
                    if (extendsRefSymbol && (extendsRefSymbol._kind === 'import' || extendsRefSymbol._kind === 'class')) {
                        return extendsRefSymbol;
                    } else {
                        this.diagnostics.warn(decl, `cannot resolve "${valueMapping.compose}" type for "${name}"`, { word: name });
                        return null;
                    }
                }).filter((x) => !!x);
                this.extendTypedRule(
                    decl,
                    rule.selector,
                    valueMapping.compose,
                    composeSymbols
                );
            } else {
                this.diagnostics.warn(decl, 'cannot define "' + valueMapping.compose + '" inside a complex selector');
            }
        }


    }

    protected extendTypedRule(node: postcss.Node, selector: string, key: keyof StylableDirectives, value: any) {
        const name = selector.replace('.', '');
        const typedRule = <ClassSymbol | ElementSymbol>this.meta.mappedSymbols[name];
        if (typedRule[key]) {
            this.diagnostics.warn(node, `override "${key}" on typed rule "${name}"`, { word: name });
        }
        typedRule[key] = value;
    }

    protected handleImport(rule: postcss.Rule) {


        const importObj: Imported = { rule, fromRelative: '', from: '', defaultExport: '', named: {}, theme: false, overrides: [] };


        rule.walkDecls((decl) => {
            switch (decl.prop) {
                case valueMapping.from:
                    const importPath = stripQuotation(decl.value);
                    if (!path.isAbsolute(importPath) && !importPath.startsWith('.')) {
                        importObj.fromRelative = importPath;
                        importObj.from = importPath;
                    } else {
                        importObj.fromRelative = importPath
                        importObj.from = path.resolve(path.dirname(this.meta.source), importPath);
                    }
                    break;
                case valueMapping.default:
                    importObj.defaultExport = decl.value;
                    break;
                case valueMapping.named:
                    importObj.named = parseNamed(decl.value);
                    break;
                case valueMapping.theme:
                    importObj.theme = parseTheme(decl.value);
                    break;
                default:
                    importObj.overrides.push(decl);
                    break;
            }
        });
        if (!importObj.theme) {
            importObj.overrides.forEach((decl) => {
                this.diagnostics.warn(decl,`"${decl.prop}" css attribute cannot be used inside :import block`, {word:decl.prop})
            })
        }

        if (!importObj.from) {
            this.diagnostics.error(rule, `"${valueMapping.from}" is missing in :import block`);
        }

        rule.remove();

        return importObj;

    }
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
    "-st-root"?: boolean;
    "-st-compose"?: Array<ImportSymbol | ClassSymbol>;
    "-st-states"?: any;
    "-st-extends"?: ImportSymbol | ClassSymbol;
    "-st-theme"?: boolean;
}

export interface ClassSymbol extends StylableDirectives {
    _kind: 'class';
    name: string;
    alias?: ImportSymbol;
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
    node: postcss.Node
}

export type StylableSymbol = ImportSymbol | VarSymbol | ClassSymbol | ElementSymbol;

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
    diagnostics: Diagnostics;
}

export interface RefedMixin {
    mixin: MixinValue,
    ref: ImportSymbol | ClassSymbol
}

//TODO: maybe put under stylable namespace object in v2
export interface SRule extends postcss.Rule {
    selectorAst: SelectorAstNode;
    isSimpleSelector: boolean;
    selectorType: 'class' | 'element' | 'complex';
    mixins?: RefedMixin[];
}


//TODO: maybe put under stylable namespace object in v2
export interface SAtRule extends postcss.AtRule {
    sourceParams: string;
}


//TODO: maybe put under stylable namespace object in v2
export interface SDecl extends postcss.Declaration {
    sourceValue: string;
}
