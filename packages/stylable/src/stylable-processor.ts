import * as postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import * as path from './path';
import {
    createSimpleSelectorChecker,
    isChildOfAtRule,
    isCompRoot,
    isRootValid,
    parseSelector,
    SelectorAstNode,
    traverseNode
} from './selector-utils';
import { processDeclarationUrls } from './stylable-assets';
import {
    ClassSymbol,
    ElementSymbol,
    Imported,
    ImportSymbol,
    RefedMixin,
    StylableDirectives,
    StylableMeta,
    VarSymbol
} from './stylable-meta';
import { CUSTOM_SELECTOR_RE, expandCustomSelectors, getAlias, getSourcePath } from './stylable-utils';
import { SBTypesParsers, stValuesMap, valueMapping } from './stylable-value-parsers';
import { deprecated, filename2varname, stripQuotation } from './utils';
export * from './stylable-meta'; /* TEMP EXPORT */
const hash = require('murmurhash');

const parseNamed = SBTypesParsers[valueMapping.named];
const parseMixin = SBTypesParsers[valueMapping.mixin];
const parseStates = SBTypesParsers[valueMapping.states];
const parseCompose = SBTypesParsers[valueMapping.compose];
const parseTheme = SBTypesParsers[valueMapping.theme];
const parseGlobal = SBTypesParsers[valueMapping.global];
const parseExtends = SBTypesParsers[valueMapping.extends];

/* tslint:disable:max-line-length */
export const processorWarnings = {
    UNSCOPED_CLASS(name: string) { return `unscoped native element "${name}" will affect all elements of the same type in the document`; },
    UNSCOPED_ELEMENT(name: string) { return `unscoped native element "${name}" will affect all elements of the same type in the document`; },
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(name: string) { return `cannot define "${name}" inside a complex selector`; },
    ROOT_AFTER_SPACING() { return '".root" class cannot be used after native elements or selectors external to the stylesheet'; },
    DEFAULT_IMPORT_IS_LOWER_CASE() { return 'Default import of a Stylable stylesheet must start with an upper-case letter'; },
    ILLEGAL_PROP_IN_IMPORT(propName: string) { return `"${propName}" css attribute cannot be used inside :import block`; },
    FROM_PROP_MISSING_IN_IMPORT() { return `"${valueMapping.from}" is missing in :import block`; },
    STATE_DEFINITION_IN_ELEMENT() { return 'cannot define pseudo states inside element selectors'; },
    STATE_DEFINITION_IN_COMPLEX() { return 'cannot define pseudo states inside complex selectors'; },
    REDECLARE_SYMBOL(name: string) { return `redeclare symbol "${name}"`; },
    CANNOT_RESOLVE_EXTEND(name: string) { return `cannot resolve '${valueMapping.extends}' type for '${name}'`; },
    CANNOT_RESOLVE_COMPOSE(name: string) { return `cannot resolve '${valueMapping.compose}' type for '${name}'`; },
    CANNOT_EXTEND_IN_COMPLEX() { return `cannot define "${valueMapping.extends}" inside a complex selector`; },
    CANNOT_COMPOSE_IN_COMPLEX() { return `cannot define "${valueMapping.compose}" inside a complex selector`; },
    UNKNOWN_MIXIN(name: string) { return `unknown mixin: "${name}"`; },
    OVERRIDE_MIXIN() { return `override mixin on same rule`; },
    OVERRIDE_TYPED_RULE(key: string, name: string) { return `override "${key}" on typed rule "${name}"`; }
};
/* tslint:enable:max-line-length */

export class StylableProcessor {
    protected meta!: StylableMeta;
    constructor(protected diagnostics = new Diagnostics()) { }
    public process(root: postcss.Root): StylableMeta {

        this.meta = new StylableMeta(root, this.diagnostics);

        this.handleAtRules(root);

        const stubs = this.insertCustomSelectorsStubs();

        root.walkRules((rule: SRule) => {
            if (!isChildOfAtRule(rule, 'keyframes')) {
                this.handleCustomSelectors(rule);
                this.handleRule(rule);
            }
        });

        root.walkDecls(decl => {
            if (stValuesMap[decl.prop]) {
                this.handleDirectives(decl.parent as SRule, decl);
            }
            processDeclarationUrls(decl, node => {
                this.meta.urls.push(node.url!);
            }, false);
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
        const validRoot = isRootValid(rule.selectorAst, 'root');
        let locallyScoped: boolean = false;

        traverseNode(rule.selectorAst, (node, _index, _nodes) => {
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
                        this.diagnostics.warn(rule, processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(':import'));
                    }
                } else if (name === 'vars') {
                    if (rule.selector === ':vars') {
                        this.addVarSymbols(rule);
                        return false;
                    } else {
                        this.diagnostics.warn(rule, processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(':vars'));
                    }
                }
            } else if (type === 'class') {
                this.addClassSymbolOnce(name, rule);

                if (this.meta.classes[name]) {
                    if (!this.meta.classes[name].alias) {
                        locallyScoped = true;
                    } else if (locallyScoped === false) {
                        this.diagnostics.warn(rule, processorWarnings.UNSCOPED_CLASS(name), { word: name });
                    }
                }
            } else if (type === 'element') {
                this.addElementSymbolOnce(name, rule);

                if (locallyScoped === false) {
                    this.diagnostics.warn(rule, processorWarnings.UNSCOPED_ELEMENT(name), { word: name });
                }
            } else if (type === 'nested-pseudo-class' && name === 'global') {
                return true;
            }
            return void 0;
        });

        if (rule.isSimpleSelector !== false) {
            rule.isSimpleSelector = true;
            rule.selectorType = rule.selector.match(/^\./) ? 'class' : 'element';
        } else {
            rule.selectorType = 'complex';
        }

        if (!validRoot) {
            this.diagnostics.warn(rule, processorWarnings.ROOT_AFTER_SPACING());
        }

    }

    protected checkRedeclareSymbol(symbolName: string, node: postcss.Node) {
        const symbol = this.meta.mappedSymbols[symbolName];
        if (symbol) {
            this.diagnostics.warn(node, processorWarnings.REDECLARE_SYMBOL(symbolName), { word: symbolName });
        }
    }

    protected addElementSymbolOnce(name: string, rule: postcss.Rule) {
        if (isCompRoot(name) && !this.meta.elements[name]) {
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
                import: importDef,
                context: path.dirname(this.meta.source)
            };
        }
        Object.keys(importDef.named).forEach(name => {
            this.checkRedeclareSymbol(name, importDef.rule);
            this.meta.mappedSymbols[name] = {
                _kind: 'import',
                type: 'named',
                name: importDef.named[name],
                import: importDef,
                context: path.dirname(this.meta.source)
            };
        });
    }

    protected addVarSymbols(rule: postcss.Rule) {
        rule.walkDecls(decl => {
            this.checkRedeclareSymbol(decl.prop, decl);
            let type = null;

            const prev = decl.prev() as postcss.Comment;
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
                    parseStates(decl.value, decl, this.diagnostics)
                );
            } else {
                if (rule.selectorType === 'element') {
                    this.diagnostics.warn(decl, processorWarnings.STATE_DEFINITION_IN_ELEMENT());
                } else {
                    this.diagnostics.warn(decl, processorWarnings.STATE_DEFINITION_IN_COMPLEX());
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
                        getAlias(extendsRefSymbol) || extendsRefSymbol
                    );
                } else {
                    this.diagnostics.warn(
                        decl,
                        processorWarnings.CANNOT_RESOLVE_EXTEND(decl.value),
                        { word: decl.value }
                    );
                }
            } else {
                this.diagnostics.warn(decl, processorWarnings.CANNOT_EXTEND_IN_COMPLEX());
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
                    this.diagnostics.warn(decl, processorWarnings.UNKNOWN_MIXIN(mixin.type), { word: mixin.type });
                }
            });

            if (rule.mixins) {
                this.diagnostics.warn(decl, processorWarnings.OVERRIDE_MIXIN());
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
                            processorWarnings.CANNOT_RESOLVE_COMPOSE(name),
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
                this.diagnostics.warn(decl, processorWarnings.CANNOT_COMPOSE_IN_COMPLEX());
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
            this.diagnostics.warn(node, processorWarnings.OVERRIDE_TYPED_RULE(key, name), { word: name });
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

        if (importObj.defaultExport && !isCompRoot(importObj.defaultExport) && importObj.from.match(/\.css$/)) {
            this.diagnostics.warn(
                rule,
                processorWarnings.DEFAULT_IMPORT_IS_LOWER_CASE(),
                { word: importObj.defaultExport }
            );
        }

        if (!importObj.theme) {
            importObj.overrides.forEach(decl => {
                this.diagnostics.warn(
                    decl,
                    processorWarnings.ILLEGAL_PROP_IN_IMPORT(decl.prop),
                    { word: decl.prop }
                );
            });
        }

        if (!importObj.from) {
            this.diagnostics.error(
                rule,
                processorWarnings.FROM_PROP_MISSING_IN_IMPORT()
            );
        }

        rule.remove();

        return importObj;

    }
}

export function createEmptyMeta(root: postcss.Root, diagnostics: Diagnostics): StylableMeta {
    deprecated('createEmptyMeta is deprecated and will be removed in the next version. Use "new StylableMeta()"');
    return new StylableMeta(root, diagnostics);
}

export function processNamespace(namespace: string, source: string) {
    return namespace + hash.v3(source); // .toString(36);
}

export function process(root: postcss.Root, diagnostics = new Diagnostics()) {
    return new StylableProcessor(diagnostics).process(root);
}

// TODO: maybe put under stylable namespace object in v2
export interface SRule extends postcss.Rule {
    selectorAst: SelectorAstNode;
    isSimpleSelector: boolean;
    selectorType: 'class' | 'element' | 'complex';
    mixins?: RefedMixin[];
}

// TODO: maybe put under stylable namespace object in v2
export interface DeclStylableProps {
    sourceValue: string;
}

export interface SDecl extends postcss.Declaration {
    stylable: DeclStylableProps;
}
