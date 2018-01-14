import * as path from 'path';
import * as postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import {
    createRootAfterSpaceChecker,
    createSimpleSelectorChecker,
    parseSelector,
    SelectorAstNode,
    traverseNode
} from './selector-utils';
import { CUSTOM_SELECTOR_RE, expandCustomSelectors } from './stylable-utils';
import { MixinValue, SBTypesParsers, stValues, valueMapping } from './stylable-value-parsers';
import { Pojo } from './types';
import { filename2varname, stripQuotation } from './utils';
const hash = require('murmurhash');

const parseNamed = SBTypesParsers[valueMapping.named];
const parseMixin = SBTypesParsers[valueMapping.mixin];
const parseStates = SBTypesParsers[valueMapping.states];
const parseCompose = SBTypesParsers[valueMapping.compose];
const parseTheme = SBTypesParsers[valueMapping.theme];
const parseGlobal = SBTypesParsers[valueMapping.global];
const parseExtends = SBTypesParsers[valueMapping.extends];

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
        customSelectors: {},
        diagnostics,
        transformDiagnostics: null
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
    return namespace + hash.v3(source); // .toString(36);
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

        const stubs = this.insertCustomSelectorsStubs();

        root.walkRules((rule: SRule) => {
            this.handleCustomSelectors(rule);
            this.handleRule(rule);
        });

        root.walkDecls((decl: SDecl) => {
            // TODO: optimize
            if (stValues.indexOf(decl.prop) !== -1) {
                this.handleDirectives(decl.parent as SRule, decl);
            }
        });

        stubs.forEach(s => s && s.remove());

        return this.meta;

    }

    public insertCustomSelectorsStubs() {
        return Object.keys(this.meta.customSelectors).map(selector => {
            if (this.meta.customSelectors[selector]) {
                const rule = postcss.rule({ selector });
                this.meta.ast.append(rule);
                return rule;
            }
            return null;
        });
    }

    public handleCustomSelectors(rule: postcss.Rule) {
        expandCustomSelectors(rule, this.meta.customSelectors, this.meta.diagnostics);
    }

    protected handleAtRules(root: postcss.Root) {
        let namespace = '';
        const toRemove: postcss.Node[] = [];
        root.walkAtRules(atRule => {
            switch (atRule.name) {
                case 'namespace':
                    const match = atRule.params.match(/["'](.*?)['"]/);
                    match ? (namespace = match[1]) : this.diagnostics.error(atRule, 'invalid namespace');
                    toRemove.push(atRule);
                    break;
                case 'keyframes':
                    this.meta.keyframes.push(atRule);
                    break;
                case 'custom-selector':
                    const params = atRule.params.split(/\s/);
                    const customName = params.shift();
                    toRemove.push(atRule);
                    if (customName && customName.match(CUSTOM_SELECTOR_RE)) {
                        this.meta.customSelectors[customName] = atRule.params.replace(customName, '').trim();
                    } else {
                        // TODO: add warn there are two types one is not valid name and the other is empty name.
                    }
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
                if (prev) {
                    /*TODO: maybe warn on element that is not a direct child div vs > div*/
                }
            }
            return void 0;
        });

        if (rule.isSimpleSelector !== false) {
            rule.isSimpleSelector = true;
            rule.selectorType = rule.selector.match(/^\./) ? 'class' : 'element';
        } else {
            rule.selectorType = 'complex';
        }

        if (!isValidRootUsage()) {
            this.diagnostics.warn(rule, '.root class cannot be used after spacing');
        }

    }

    protected checkRedeclareSymbol(symbolName: string, node: postcss.Node) {
        const symbol = this.meta.mappedSymbols[symbolName];
        if (symbol) {
            this.diagnostics.warn(node, `redeclare symbol "${symbolName}"`, { word: symbolName });
        }
    }

    protected addElementSymbolOnce(name: string, rule: postcss.Rule) {
        if (name.charAt(0).match(/[A-Z]/) && !this.meta.elements[name]) {
            let alias = this.meta.mappedSymbols[name] as ImportSymbol | undefined;
            if (alias && alias._kind !== 'import') {
                this.checkRedeclareSymbol(name, rule);
                alias = undefined;
            }
            this.meta.elements[name] = this.meta.mappedSymbols[name] = { _kind: 'element', name, alias };
        }
    }

    protected addClassSymbolOnce(name: string, rule: postcss.Rule) {
        if (!this.meta.classes[name]) {
            let alias = this.meta.mappedSymbols[name] as ImportSymbol | undefined;
            if (alias && alias._kind !== 'import') {
                this.checkRedeclareSymbol(name, rule);
                alias = undefined;
            }
            this.meta.classes[name] = this.meta.mappedSymbols[name] = { _kind: 'class', name, alias };
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
        Object.keys(importDef.named).forEach(name => {
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
        rule.walkDecls(decl => {
            this.checkRedeclareSymbol(decl.prop, decl);
            let type = null;

            const prev = decl.prev();
            if (prev && prev.type === 'comment') {
                const typeMatch = prev.text.match(/^@type (.+)$/);
                if (typeMatch) {
                    type = typeMatch[1];
                }
            }

            const varSymbol: VarSymbol = {
                _kind: 'var',
                name: decl.prop,
                value: '',
                text: decl.value,
                node: decl,
                valueType: type
            };
            this.meta.vars.push(varSymbol);
            this.meta.mappedSymbols[decl.prop] = varSymbol;
        });
        rule.remove();
    }

    protected handleDirectives(rule: SRule, decl: postcss.Declaration) {
        if (decl.prop === valueMapping.states) {
            if (rule.isSimpleSelector && rule.selectorType !== 'element') {
                this.extendTypedRule(
                    decl,
                    rule.selector,
                    valueMapping.states,
                    parseStates(decl.value, this.diagnostics)
                );
            } else {
                if (rule.selectorType === 'element') {
                    this.diagnostics.warn(decl, 'cannot define pseudo states inside element selectors');
                } else {
                    this.diagnostics.warn(decl, 'cannot define pseudo states inside complex selectors');
                }
            }
        } else if (decl.prop === valueMapping.extends) {
            if (rule.isSimpleSelector) {
                const parsed = parseExtends(decl.value);
                const symbolName = parsed.types[0] && parsed.types[0].symbolName;

                const extendsRefSymbol = this.meta.mappedSymbols[symbolName];
                if (
                    extendsRefSymbol &&
                    (
                        extendsRefSymbol._kind === 'import' ||
                        extendsRefSymbol._kind === 'class' ||
                        extendsRefSymbol._kind === 'element'
                    ) ||
                    decl.value === this.meta.root
                ) {
                    this.extendTypedRule(
                        decl,
                        rule.selector,
                        valueMapping.extends,
                        extendsRefSymbol
                    );
                } else {
                    this.diagnostics.warn(
                        decl,
                        `cannot resolve '${valueMapping.extends}' type for '${decl.value}'`,
                        { word: decl.value }
                    );
                }
            } else {
                this.diagnostics.warn(decl, 'cannot define "' + valueMapping.extends + '" inside a complex selector');
            }

        } else if (decl.prop === valueMapping.mixin) {
            const mixins: RefedMixin[] = [];
            parseMixin(decl, type => {
                const mixinRefSymbol = this.meta.mappedSymbols[type];
                if (mixinRefSymbol && mixinRefSymbol._kind === 'import' && !mixinRefSymbol.import.from.match(/.css$/)) {
                    return 'args';
                }
                return 'named';

            }, this.diagnostics).forEach(mixin => {
                const mixinRefSymbol = this.meta.mappedSymbols[mixin.type];
                if (mixinRefSymbol && (mixinRefSymbol._kind === 'import' || mixinRefSymbol._kind === 'class')) {
                    mixins.push({
                        mixin,
                        ref: mixinRefSymbol
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
            const composes = parseCompose(decl, this.diagnostics);
            if (rule.isSimpleSelector) {
                const composeSymbols = composes.map(name => {
                    const extendsRefSymbol = this.meta.mappedSymbols[name];
                    if (
                        extendsRefSymbol &&
                        (extendsRefSymbol._kind === 'import' || extendsRefSymbol._kind === 'class')
                    ) {
                        return extendsRefSymbol;
                    } else {
                        this.diagnostics.warn(
                            decl,
                            `cannot resolve '${valueMapping.compose}' type for '${name}'`,
                            { word: name }
                        );
                        return null;
                    }
                }).filter(x => !!x);
                this.extendTypedRule(
                    decl,
                    rule.selector,
                    valueMapping.compose,
                    composeSymbols
                );
            } else {
                this.diagnostics.warn(decl, 'cannot define "' + valueMapping.compose + '" inside a complex selector');
            }
        } else if (decl.prop === valueMapping.global) {
            if (rule.isSimpleSelector && rule.selectorType !== 'element') {
                this.setClassGlobalMapping(decl, rule);
            } else {
                // TODO: diagnostics - scoped on none class
            }
        }

    }

    protected setClassGlobalMapping(decl: postcss.Declaration, rule: postcss.Rule) {
        const name = rule.selector.replace('.', '');
        const typedRule = this.meta.classes[name];
        if (typedRule) {
            typedRule[valueMapping.global] = parseGlobal(decl, this.diagnostics);
        }
    }

    protected extendTypedRule(node: postcss.Node, selector: string, key: keyof StylableDirectives, value: any) {
        const name = selector.replace('.', '');
        const typedRule = this.meta.mappedSymbols[name] as ClassSymbol | ElementSymbol;
        if (typedRule && typedRule[key]) {
            this.diagnostics.warn(node, `override "${key}" on typed rule "${name}"`, { word: name });
        }
        if (typedRule) {
            typedRule[key] = value;
        }
    }

    protected handleImport(rule: postcss.Rule) {

        const importObj: Imported = {
            defaultExport: '', from: '', fromRelative: '', named: {}, overrides: [], rule, theme: false
        };

        rule.walkDecls(decl => {
            switch (decl.prop) {
                case valueMapping.from:
                    const importPath = stripQuotation(decl.value);
                    if (!path.isAbsolute(importPath) && !importPath.startsWith('.')) {
                        importObj.fromRelative = importPath;
                        importObj.from = importPath;
                    } else {
                        importObj.fromRelative = importPath;
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
            importObj.overrides.forEach(decl => {
                this.diagnostics.warn(
                    decl,
                    `'${decl.prop}' css attribute cannot be used inside :import block`,
                    { word: decl.prop }
                );
            });
        }

        if (!importObj.from) {
            this.diagnostics.error(
                rule,
                `'${valueMapping.from}' is missing in :import block`
            );
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
    '-st-root'?: boolean;
    '-st-compose'?: Array<ImportSymbol | ClassSymbol>;
    '-st-states'?: any;
    '-st-extends'?: ImportSymbol | ClassSymbol | ElementSymbol;
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
    valueType: string | null;
    node: postcss.Node;
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
    customSelectors: Pojo<string>;
    diagnostics: Diagnostics;
    transformDiagnostics: Diagnostics | null;
}

export interface RefedMixin {
    mixin: MixinValue;
    ref: ImportSymbol | ClassSymbol;
}

// TODO: maybe put under stylable namespace object in v2
export interface SRule extends postcss.Rule {
    selectorAst: SelectorAstNode;
    isSimpleSelector: boolean;
    selectorType: 'class' | 'element' | 'complex';
    mixins?: RefedMixin[];
}

// TODO: maybe put under stylable namespace object in v2
export interface SAtRule extends postcss.AtRule {
    sourceParams: string;
}

// TODO: maybe put under stylable namespace object in v2
export interface DeclStylableProps {
    sourceValue: string;
}

export interface SDecl extends postcss.Declaration {
    stylable: DeclStylableProps;
}
