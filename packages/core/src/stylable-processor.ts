import hash from 'murmurhash';
import { basename, dirname } from 'path';
import postcss from 'postcss';
import { Diagnostics } from './diagnostics';
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
    CSSVarSymbol,
    ElementSymbol,
    Imported,
    ImportSymbol,
    RefedMixin,
    StylableDirectives,
    StylableMeta,
    VarSymbol
} from './stylable-meta';
import {
    CUSTOM_SELECTOR_RE,
    expandCustomSelectors,
    getAlias,
    isCSSVarProp
} from './stylable-utils';
import {
    rootValueMapping,
    SBTypesParsers,
    stValuesMap,
    validateAllowedNodesUntil,
    valueMapping
} from './stylable-value-parsers';
import { ParsedValue } from './types';
import { deprecated, filename2varname, stripQuotation } from './utils';
export * from './stylable-meta'; /* TEMP EXPORT */
const valueParser = require('postcss-value-parser');

const parseNamed = SBTypesParsers[valueMapping.named];
const parseMixin = SBTypesParsers[valueMapping.mixin];
const parseStates = SBTypesParsers[valueMapping.states];
const parseGlobal = SBTypesParsers[valueMapping.global];
const parseExtends = SBTypesParsers[valueMapping.extends];

export const processorWarnings = {
    UNSCOPED_CLASS(name: string) {
        return `unscoped class "${name}" will affect all elements of the same type in the document`;
    },
    UNSCOPED_ELEMENT(name: string) {
        return `unscoped element "${name}" will affect all elements of the same type in the document`;
    },
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(name: string) {
        return `cannot define "${name}" inside a complex selector`;
    },
    ROOT_AFTER_SPACING() {
        return '".root" class cannot be used after native elements or selectors external to the stylesheet';
    },
    DEFAULT_IMPORT_IS_LOWER_CASE() {
        return 'Default import of a Stylable stylesheet must start with an upper-case letter';
    },
    ILLEGAL_PROP_IN_IMPORT(propName: string) {
        return `"${propName}" css attribute cannot be used inside ${rootValueMapping.import} block`;
    },
    STATE_DEFINITION_IN_ELEMENT() {
        return 'cannot define pseudo states inside element selectors';
    },
    STATE_DEFINITION_IN_COMPLEX() {
        return 'cannot define pseudo states inside complex selectors';
    },
    REDECLARE_SYMBOL(name: string) {
        return `redeclare symbol "${name}"`;
    },
    CANNOT_RESOLVE_EXTEND(name: string) {
        return `cannot resolve '${valueMapping.extends}' type for '${name}'`;
    },
    CANNOT_EXTEND_IN_COMPLEX() {
        return `cannot define "${valueMapping.extends}" inside a complex selector`;
    },
    UNKNOWN_MIXIN(name: string) {
        return `unknown mixin: "${name}"`;
    },
    OVERRIDE_MIXIN() {
        return `override mixin on same rule`;
    },
    OVERRIDE_TYPED_RULE(key: string, name: string) {
        return `override "${key}" on typed rule "${name}"`;
    },
    FROM_PROP_MISSING_IN_IMPORT() {
        return `"${valueMapping.from}" is missing in ${rootValueMapping.import} block`;
    },
    INVALID_NAMESPACE_DEF() {
        return 'invalid @namespace';
    },
    EMPTY_NAMESPACE_DEF() {
        return '@namespace must contain at least one character or digit';
    },
    EMPTY_IMPORT_FROM() {
        return '"-st-from" cannot be empty';
    },
    MULTIPLE_FROM_IN_IMPORT() {
        return `cannot define multiple "${valueMapping.from}" declarations in a single import`;
    },
    NO_VARS_DEF_IN_ST_SCOPE() {
        return `cannot define "${rootValueMapping.vars}" inside of "@st-scope"`;
    },
    NO_IMPORT_IN_ST_SCOPE() {
        return `cannot use "${rootValueMapping.import}" inside of "@st-scope"`;
    },
    NO_KEYFRAMES_IN_ST_SCOPE() {
        return `cannot use "@keyframes" inside of "@st-scope"`;
    },
    SCOPE_PARAM_NOT_SIMPLE_SELECTOR(selector: string) {
        return `"@st-scope" must receive a simple selector, but instead got: "${selector}"`;
    },
    MISSING_SCOPING_PARAM() {
        return '"@st-scope" must receive a simple selector or stylesheet "root" as its scoping parameter';
    },
    ILLEGAL_GLOBAL_CSS_VAR(name: string) {
        return `"@st-global-custom-property" received the value "${name}", but it must begin with "--" (double-dash)`;
    },
    GLOBAL_CSS_VAR_MISSING_COMMA(name: string) {
        return `"@st-global-custom-property" received the value "${name}", but its values must be comma separated`;
    },
    ILLEGAL_CSS_VAR_USE(name: string) {
        return `a custom css property must begin with "--" (double-dash), but received "${name}"`;
    },
    ILLEGAL_CSS_VAR_ARGS(name: string) {
        return `css variable "${name}" usage (var()) must receive comma separated values`;
    }
};

export class StylableProcessor {
    protected meta!: StylableMeta;
    constructor(
        protected diagnostics = new Diagnostics(),
        private resolveNamespace = processNamespace
    ) {}
    public process(root: postcss.Root): StylableMeta {
        this.meta = new StylableMeta(root, this.diagnostics);

        this.handleAtRules(root);

        const stubs = this.insertCustomSelectorsStubs();

        root.walkRules((rule: SRule) => {
            if (!isChildOfAtRule(rule, 'keyframes')) {
                this.handleCustomSelectors(rule);
                this.handleRule(rule, isChildOfAtRule(rule, rootValueMapping.stScope));
            }
        });

        root.walkDecls(decl => {
            if (stValuesMap[decl.prop]) {
                this.handleDirectives(decl.parent as SRule, decl);
            } else if (isCSSVarProp(decl.prop)) {
                this.addCSSVarFromProp(decl);
            }

            if (decl.value.includes('var(')) {
                this.handleCSSVarUse(decl);
            }

            processDeclarationUrls(
                decl,
                node => {
                    this.meta.urls.push(node.url!);
                },
                false
            );
        });

        this.meta.scopes.forEach(atRule => {
            const scopingRule = postcss.rule({ selector: atRule.params }) as SRule;
            this.handleRule(scopingRule, true);
            validateScopingSelector(atRule, scopingRule, this.diagnostics);

            if (scopingRule.selector) {
                atRule.walkRules(rule => {
                    rule.replaceWith(
                        rule.clone({ selector: `${scopingRule.selector} ${rule.selector}` })
                    );
                });
            }

            atRule.replaceWith(atRule.nodes || []);
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
                    if (match) {
                        if (!!match[1].trim()) {
                            namespace = match[1];
                        } else {
                            this.diagnostics.error(atRule, processorWarnings.EMPTY_NAMESPACE_DEF());
                        }
                        toRemove.push(atRule);
                    } else {
                        this.diagnostics.error(atRule, processorWarnings.INVALID_NAMESPACE_DEF());
                    }
                    break;
                case 'keyframes':
                    if (!isChildOfAtRule(atRule, rootValueMapping.stScope)) {
                        this.meta.keyframes.push(atRule);
                    } else {
                        this.diagnostics.warn(atRule, processorWarnings.NO_KEYFRAMES_IN_ST_SCOPE());
                    }
                    break;
                case 'custom-selector':
                    const params = atRule.params.split(/\s/);
                    const customName = params.shift();
                    toRemove.push(atRule);
                    if (customName && customName.match(CUSTOM_SELECTOR_RE)) {
                        this.meta.customSelectors[customName] = atRule.params
                            .replace(customName, '')
                            .trim();
                    } else {
                        // TODO: add warn there are two types one is not valid name and the other is empty name.
                    }
                    break;
                case 'st-scope':
                    this.meta.scopes.push(atRule);
                    break;
                case 'st-global-custom-property':
                    const cssVars = atRule.params.split(',');

                    if (atRule.params.trim().split(/\s+/g).length > cssVars.length) {
                        this.diagnostics.warn(
                            atRule,
                            processorWarnings.GLOBAL_CSS_VAR_MISSING_COMMA(atRule.params),
                            { word: atRule.params }
                        );
                        break;
                    }

                    for (const entry of cssVars) {
                        const cssVar = entry.trim();

                        if (isCSSVarProp(cssVar)) {
                            if (!this.meta.cssVars[cssVar]) {
                                this.meta.cssVars[cssVar] = {
                                    _kind: 'cssVar',
                                    name: cssVar,
                                    global: true
                                };
                                this.meta.mappedSymbols[cssVar] = this.meta.cssVars[cssVar];
                            }
                        } else {
                            this.diagnostics.warn(
                                atRule,
                                processorWarnings.ILLEGAL_GLOBAL_CSS_VAR(cssVar),
                                { word: cssVar }
                            );
                        }
                    }
                    toRemove.push(atRule);
                    break;
            }
        });
        toRemove.forEach(node => node.remove());
        namespace = namespace || filename2varname(basename(this.meta.source)) || 's';
        this.meta.namespace = this.resolveNamespace(namespace, this.meta.source);
    }

    protected handleRule(rule: SRule, inStScope: boolean = false) {
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
                    if (rule.selector === rootValueMapping.import) {
                        if (isChildOfAtRule(rule, rootValueMapping.stScope)) {
                            this.diagnostics.warn(rule, processorWarnings.NO_IMPORT_IN_ST_SCOPE());
                            rule.remove();
                            return false;
                        }

                        const _import = this.handleImport(rule);
                        this.meta.imports.push(_import);
                        this.addImportSymbols(_import);
                        return false;
                    } else {
                        this.diagnostics.warn(
                            rule,
                            processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(
                                rootValueMapping.import
                            )
                        );
                    }
                } else if (name === 'vars') {
                    if (rule.selector === rootValueMapping.vars) {
                        if (isChildOfAtRule(rule, rootValueMapping.stScope)) {
                            this.diagnostics.warn(
                                rule,
                                processorWarnings.NO_VARS_DEF_IN_ST_SCOPE()
                            );
                            rule.remove();
                            return false;
                        }

                        this.addVarSymbols(rule);
                        return false;
                    } else {
                        this.diagnostics.warn(
                            rule,
                            processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(
                                rootValueMapping.vars
                            )
                        );
                    }
                }
            } else if (type === 'class') {
                this.addClassSymbolOnce(name, rule);

                if (this.meta.classes[name]) {
                    if (!this.meta.classes[name].alias) {
                        locallyScoped = true;
                    } else if (locallyScoped === false) {
                        this.diagnostics.warn(rule, processorWarnings.UNSCOPED_CLASS(name), {
                            word: name
                        });
                    }
                }
            } else if (type === 'element') {
                this.addElementSymbolOnce(name, rule);

                if (locallyScoped === false && !inStScope) {
                    this.diagnostics.warn(rule, processorWarnings.UNSCOPED_ELEMENT(name), {
                        word: name
                    });
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
            this.diagnostics.warn(node, processorWarnings.REDECLARE_SYMBOL(symbolName), {
                word: symbolName
            });
        }
    }

    protected addElementSymbolOnce(name: string, rule: postcss.Rule) {
        if (isCompRoot(name) && !this.meta.elements[name]) {
            let alias = this.meta.mappedSymbols[name] as ImportSymbol | undefined;
            if (alias && alias._kind !== 'import') {
                this.checkRedeclareSymbol(name, rule);
                alias = undefined;
            }
            this.meta.elements[name] = this.meta.mappedSymbols[name] = {
                _kind: 'element',
                name,
                alias
            };
        }
    }

    protected addClassSymbolOnce(name: string, rule: postcss.Rule) {
        if (!this.meta.classes[name]) {
            let alias = this.meta.mappedSymbols[name] as ImportSymbol | undefined;
            if (alias && alias._kind !== 'import') {
                this.checkRedeclareSymbol(name, rule);
                alias = undefined;
            }
            this.meta.classes[name] = this.meta.mappedSymbols[name] = {
                _kind: 'class',
                name,
                alias
            };
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
                context: dirname(this.meta.source)
            };
        }
        Object.keys(importDef.named).forEach(name => {
            this.checkRedeclareSymbol(name, importDef.rule);
            this.meta.mappedSymbols[name] = {
                _kind: 'import',
                type: 'named',
                name: importDef.named[name],
                import: importDef,
                context: dirname(this.meta.source)
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

    protected handleCSSVarUse(decl: postcss.Declaration) {
        const parsed = valueParser(decl.value);
        parsed.walk((node: ParsedValue) => {
            if (node.type === 'function' && node.value === 'var' && node.nodes) {
                const varName = node.nodes[0];
                if (!validateAllowedNodesUntil(node, 1)) {
                    const args = valueParser.stringify(node.nodes);
                    this.diagnostics.warn(decl, processorWarnings.ILLEGAL_CSS_VAR_ARGS(args), {
                        word: args
                    });
                }

                this.addCSSVar(valueParser.stringify(varName).trim(), decl);
            }
        });
    }

    protected addCSSVarFromProp(decl: postcss.Declaration) {
        const varName = decl.prop.trim();
        this.addCSSVar(varName, decl);
    }

    protected addCSSVar(varName: string, decl: postcss.Declaration) {
        if (isCSSVarProp(varName)) {
            if (!this.meta.cssVars[varName]) {
                const cssVarSymbol: CSSVarSymbol = {
                    _kind: 'cssVar',
                    name: varName
                };
                this.meta.cssVars[varName] = cssVarSymbol;
                if (!this.meta.mappedSymbols[varName]) {
                    this.meta.mappedSymbols[varName] = cssVarSymbol;
                }
            }
        } else {
            this.diagnostics.warn(decl, processorWarnings.ILLEGAL_CSS_VAR_USE(varName), {
                word: varName
            });
        }
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
                    (extendsRefSymbol &&
                        (extendsRefSymbol._kind === 'import' ||
                            extendsRefSymbol._kind === 'class' ||
                            extendsRefSymbol._kind === 'element')) ||
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
            parseMixin(
                decl,
                type => {
                    const mixinRefSymbol = this.meta.mappedSymbols[type];
                    if (
                        mixinRefSymbol &&
                        mixinRefSymbol._kind === 'import' &&
                        !mixinRefSymbol.import.from.match(/.css$/)
                    ) {
                        return 'args';
                    }
                    return 'named';
                },
                this.diagnostics
            ).forEach(mixin => {
                const mixinRefSymbol = this.meta.mappedSymbols[mixin.type];
                if (
                    mixinRefSymbol &&
                    (mixinRefSymbol._kind === 'import' || mixinRefSymbol._kind === 'class')
                ) {
                    mixins.push({
                        mixin,
                        ref: mixinRefSymbol
                    });
                } else {
                    this.diagnostics.warn(decl, processorWarnings.UNKNOWN_MIXIN(mixin.type), {
                        word: mixin.type
                    });
                }
            });

            if (rule.mixins) {
                this.diagnostics.warn(decl, processorWarnings.OVERRIDE_MIXIN());
            }

            rule.mixins = mixins;
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

    protected extendTypedRule(
        node: postcss.Node,
        selector: string,
        key: keyof StylableDirectives,
        value: any
    ) {
        const name = selector.replace('.', '');
        const typedRule = this.meta.mappedSymbols[name] as ClassSymbol | ElementSymbol;
        if (typedRule && typedRule[key]) {
            this.diagnostics.warn(node, processorWarnings.OVERRIDE_TYPED_RULE(key, name), {
                word: name
            });
        }
        if (typedRule) {
            typedRule[key] = value;
        }
    }

    protected handleImport(rule: postcss.Rule) {
        let fromExists = false;
        const importObj: Imported = {
            defaultExport: '',
            from: '',
            fromRelative: '',
            named: {},
            rule,
            context: dirname(this.meta.source)
        };

        rule.walkDecls(decl => {
            switch (decl.prop) {
                case valueMapping.from:
                    const importPath = stripQuotation(decl.value);
                    if (!importPath.trim()) {
                        this.diagnostics.error(decl, processorWarnings.EMPTY_IMPORT_FROM());
                    }

                    if (fromExists) {
                        this.diagnostics.warn(rule, processorWarnings.MULTIPLE_FROM_IN_IMPORT());
                    }

                    importObj.fromRelative = importPath;
                    importObj.from = importPath;
                    fromExists = true;
                    break;
                case valueMapping.default:
                    importObj.defaultExport = decl.value;

                    if (!isCompRoot(importObj.defaultExport) && importObj.from.match(/\.css$/)) {
                        this.diagnostics.warn(
                            decl,
                            processorWarnings.DEFAULT_IMPORT_IS_LOWER_CASE(),
                            { word: importObj.defaultExport }
                        );
                    }
                    break;
                case valueMapping.named:
                    importObj.named = parseNamed(decl.value);
                    break;
                default:
                    this.diagnostics.warn(
                        decl,
                        processorWarnings.ILLEGAL_PROP_IN_IMPORT(decl.prop),
                        { word: decl.prop }
                    );
                    break;
            }
        });

        if (!importObj.from) {
            this.diagnostics.error(rule, processorWarnings.FROM_PROP_MISSING_IN_IMPORT());
        }

        rule.remove();

        return importObj;
    }
}

export function validateScopingSelector(
    atRule: postcss.AtRule,
    { selector: scopingSelector, isSimpleSelector }: SRule,
    diagnostics: Diagnostics
) {
    if (!scopingSelector) {
        diagnostics.warn(atRule, processorWarnings.MISSING_SCOPING_PARAM());
    } else if (!isSimpleSelector) {
        diagnostics.warn(
            atRule,
            processorWarnings.SCOPE_PARAM_NOT_SIMPLE_SELECTOR(scopingSelector),
            { word: scopingSelector }
        );
    }
}

export function createEmptyMeta(root: postcss.Root, diagnostics: Diagnostics): StylableMeta {
    deprecated(
        'createEmptyMeta is deprecated and will be removed in the next version. Use "new StylableMeta()"'
    );
    return new StylableMeta(root, diagnostics);
}

export function processNamespace(namespace: string, source: string) {
    return namespace + hash.v3(source); // .toString(36);
}

export function process(
    root: postcss.Root,
    diagnostics = new Diagnostics(),
    resolveNamespace?: typeof processNamespace
) {
    return new StylableProcessor(diagnostics, resolveNamespace).process(root);
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
