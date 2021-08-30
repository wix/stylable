import path from 'path';
import * as postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import { tokenizeImports } from 'toky';
import { deprecatedStFunctions } from './custom-values';
import { Diagnostics } from './diagnostics';
import { murmurhash3_32_gc } from './murmurhash';
import { reservedKeyFrames } from './native-reserved-lists';
import {
    createSimpleSelectorChecker,
    isChildOfAtRule,
    isCompRoot,
    isNested,
    isRootValid,
    parseSelector,
    SelectorAstNode,
    traverseNode,
} from './selector-utils';
import {
    ClassSymbol,
    CSSVarSymbol,
    ElementSymbol,
    Imported,
    ImportSymbol,
    RefedMixin,
    StylableDirectives,
    StylableMeta,
    VarSymbol,
} from './stylable-meta';
import {
    CUSTOM_SELECTOR_RE,
    expandCustomSelectors,
    getAlias,
    isCSSVarProp,
    processDeclarationFunctions,
    scopeSelector,
} from './stylable-utils';
import {
    paramMapping,
    rootValueMapping,
    SBTypesParsers,
    stValuesMap,
    validateAllowedNodesUntil,
    valueMapping,
} from './stylable-value-parsers';
import { deprecated, filename2varname, globalValue, stripQuotation } from './utils';
export * from './stylable-meta'; /* TEMP EXPORT */

const parseNamed = SBTypesParsers[valueMapping.named];
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
    REDECLARE_SYMBOL_KEYFRAMES(name: string) {
        return `redeclare keyframes symbol "${name}"`;
    },
    KEYFRAME_NAME_RESERVED(name: string) {
        return `keyframes "${name}" is reserved`;
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
    OVERRIDE_MIXIN(mixinType: string) {
        return `override ${mixinType} on same rule`;
    },
    OVERRIDE_TYPED_RULE(key: string, name: string) {
        return `override "${key}" on typed rule "${name}"`;
    },
    PARTIAL_MIXIN_MISSING_ARGUMENTS(type: string) {
        return `"${valueMapping.partialMixin}" can only be used with override arguments provided, missing overrides on "${type}"`;
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
    NO_ST_IMPORT_IN_NESTED_SCOPE() {
        return `cannot use "@st-import" inside of nested scope`;
    },
    ST_IMPORT_STAR() {
        return '@st-import * is not supported';
    },
    ST_IMPORT_EMPTY_FROM() {
        return '@st-import must specify a valid "from" string value';
    },
    INVALID_ST_IMPORT_FORMAT(errors: string[]) {
        return `Invalid @st-import format:\n - ${errors.join('\n - ')}`;
    },
    NO_KEYFRAMES_IN_ST_SCOPE() {
        return `cannot use "@keyframes" inside of "@st-scope"`;
    },
    MISSING_SCOPING_PARAM() {
        return '"@st-scope" missing scoping selector parameter';
    },
    MISSING_KEYFRAMES_NAME() {
        return '"@keyframes" missing parameter';
    },
    MISSING_KEYFRAMES_NAME_INSIDE_GLOBAL() {
        return `"@keyframes" missing parameter inside "${paramMapping.global}()"`;
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
        return `custom property "${name}" usage (var()) must receive comma separated values`;
    },
    INVALID_CUSTOM_PROPERTY_AS_VALUE(name: string, as: string) {
        return `invalid alias for custom property "${name}" as "${as}"; custom properties must be prefixed with "--" (double-dash)`;
    },
    INVALID_NAMESPACE_REFERENCE() {
        return 'st-namespace-reference dose not have any value';
    },
    INVALID_NESTING(child: string, parent: string) {
        return `nesting of rules within rules is not supported, found: "${child}" inside "${parent}"`;
    },
    DEPRECATED_ST_FUNCTION_NAME: (name: string, alternativeName: string) => {
        return `"${name}" is deprecated, use "${alternativeName}`;
    },
};

export class StylableProcessor {
    protected meta!: StylableMeta;
    protected dirContext!: string;
    constructor(
        protected diagnostics = new Diagnostics(),
        private resolveNamespace = processNamespace
    ) {}
    public process(root: postcss.Root): StylableMeta {
        this.meta = new StylableMeta(root, this.diagnostics);

        this.dirContext = path.dirname(this.meta.source);

        this.handleAtRules(root);

        const stubs = this.insertCustomSelectorsStubs();

        for (const node of root.nodes) {
            if (node.type === 'rule' && node.selector === rootValueMapping.import) {
                const imported = parsePseudoImport(node, this.dirContext, this.diagnostics);
                this.meta.imports.push(imported);
                this.addImportSymbols(imported);
            }
        }

        root.walkRules((rule) => {
            if (!isChildOfAtRule(rule, 'keyframes')) {
                this.handleCustomSelectors(rule);
                this.handleRule(rule as SRule, isChildOfAtRule(rule, rootValueMapping.stScope));
            }
            const parent = rule.parent;
            if (parent?.type === 'rule') {
                this.diagnostics.error(
                    rule,
                    processorWarnings.INVALID_NESTING(
                        rule.selector,
                        (parent as postcss.Rule).selector
                    )
                );
            }
        });

        root.walkDecls((decl) => {
            if (stValuesMap[decl.prop]) {
                this.handleDirectives(decl.parent as SRule, decl);
            } else if (isCSSVarProp(decl.prop)) {
                this.addCSSVarDefinition(decl);
            }

            if (decl.value.includes('var(')) {
                this.handleCSSVarUse(decl);
            }

            this.collectUrls(decl);
        });

        stubs.forEach((s) => s && s.remove());

        this.meta.scopes.forEach((scope) => this.handleScope(scope));

        return this.meta;
    }

    public insertCustomSelectorsStubs() {
        return Object.keys(this.meta.customSelectors).map((selector) => {
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
        root.walkAtRules((atRule) => {
            switch (atRule.name) {
                case 'namespace': {
                    const match = atRule.params.match(/["'](.*?)['"]/);
                    if (match) {
                        if (match[1].trim()) {
                            namespace = match[1];
                        } else {
                            this.diagnostics.error(atRule, processorWarnings.EMPTY_NAMESPACE_DEF());
                        }
                        toRemove.push(atRule);
                    } else {
                        this.diagnostics.error(atRule, processorWarnings.INVALID_NAMESPACE_DEF());
                    }
                    break;
                }
                case 'keyframes':
                    if (!isChildOfAtRule(atRule, rootValueMapping.stScope)) {
                        this.meta.keyframes.push(atRule);
                        let { params: name } = atRule;

                        if (name) {
                            let global: boolean | undefined;
                            const globalName = globalValue(name);

                            if (globalName !== undefined) {
                                name = globalName;
                                global = true;
                            }

                            if (name === '') {
                                this.diagnostics.warn(
                                    atRule,
                                    processorWarnings.MISSING_KEYFRAMES_NAME_INSIDE_GLOBAL()
                                );
                            }

                            if (reservedKeyFrames.includes(name)) {
                                this.diagnostics.error(
                                    atRule,
                                    processorWarnings.KEYFRAME_NAME_RESERVED(name),
                                    {
                                        word: name,
                                    }
                                );
                            }

                            this.checkRedeclareKeyframes(name, atRule);
                            this.meta.mappedKeyframes[name] = {
                                _kind: 'keyframes',
                                alias: name,
                                name,
                                global,
                            };
                        } else {
                            this.diagnostics.warn(
                                atRule,
                                processorWarnings.MISSING_KEYFRAMES_NAME()
                            );
                        }
                    } else {
                        this.diagnostics.warn(atRule, processorWarnings.NO_KEYFRAMES_IN_ST_SCOPE());
                    }
                    break;
                case 'custom-selector': {
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
                }
                case 'st-scope':
                    this.meta.scopes.push(atRule);
                    break;
                case 'st-import':
                    if (atRule.parent?.type !== 'root') {
                        this.diagnostics.warn(
                            atRule,
                            processorWarnings.NO_ST_IMPORT_IN_NESTED_SCOPE()
                        );
                        atRule.remove();
                    } else {
                        const stImport = this.handleStImport(atRule);
                        this.meta.imports.push(stImport);
                        this.addImportSymbols(stImport);
                    }

                    break;
                case 'property':
                    this.checkRedeclareSymbol(atRule.params, atRule);
                    this.addCSSVarDefinition(atRule);
                    break;
                case 'st-global-custom-property': {
                    const cssVarsByComma = atRule.params.split(',');
                    const cssVarsBySpacing = atRule.params
                        .trim()
                        .split(/\s+/g)
                        .filter((s) => s !== ',');

                    if (cssVarsBySpacing.length > cssVarsByComma.length) {
                        this.diagnostics.warn(
                            atRule,
                            processorWarnings.GLOBAL_CSS_VAR_MISSING_COMMA(atRule.params),
                            { word: atRule.params }
                        );
                        break;
                    }

                    for (const entry of cssVarsByComma) {
                        const cssVar = entry.trim();

                        if (isCSSVarProp(cssVar)) {
                            if (!this.meta.cssVars[cssVar]) {
                                this.meta.cssVars[cssVar] = {
                                    _kind: 'cssVar',
                                    name: cssVar,
                                    global: true,
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
            }
        });
        toRemove.forEach((node) => node.remove());
        namespace = namespace || filename2varname(path.basename(this.meta.source)) || 's';
        this.meta.namespace = this.handleNamespaceReference(namespace);
    }
    private collectUrls(decl: postcss.Declaration) {
        processDeclarationFunctions(
            decl,
            (node) => {
                if (node.type === 'url') {
                    this.meta.urls.push(node.url);
                }
            },
            false
        );
    }

    private handleStFunctions(decl: postcss.Declaration) {
        processDeclarationFunctions(
            decl,
            (node) => {
                if (node.type === 'nested-item' && deprecatedStFunctions[node.name]) {
                    const { alternativeName } = deprecatedStFunctions[node.name];
                    this.diagnostics.info(
                        decl,
                        processorWarnings.DEPRECATED_ST_FUNCTION_NAME(node.name, alternativeName),
                        {
                            word: node.name,
                        }
                    );
                }
            },
            false
        );
    }

    private handleNamespaceReference(namespace: string): string {
        let pathToSource: string | undefined;
        for (const node of this.meta.ast.nodes) {
            if (node.type === 'comment' && node.text.includes('st-namespace-reference')) {
                const i = node.text.indexOf('=');
                if (i === -1) {
                    this.diagnostics.error(node, processorWarnings.INVALID_NAMESPACE_REFERENCE());
                } else {
                    pathToSource = stripQuotation(node.text.slice(i + 1));
                }
                break;
            }
        }

        return this.resolveNamespace(
            namespace,
            pathToSource
                ? path.resolve(path.dirname(this.meta.source), pathToSource)
                : this.meta.source
        );
    }

    protected handleRule(rule: SRule, inStScope = false) {
        rule.selectorAst = parseSelector(rule.selector);

        const checker = createSimpleSelectorChecker();

        let locallyScoped = false;

        traverseNode(rule.selectorAst, (node, index, nodes, parents) => {
            if (node.type === 'selector' && !isNested(parents)) {
                locallyScoped = false;
            }
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
                        rule.remove();
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
                    } else if (locallyScoped === false && !inStScope) {
                        if (this.checkForScopedNodeAfter(rule, nodes, index) === false) {
                            this.diagnostics.warn(rule, processorWarnings.UNSCOPED_CLASS(name), {
                                word: name,
                            });
                        } else {
                            locallyScoped = true;
                        }
                    }
                }
            } else if (type === 'element') {
                this.addElementSymbolOnce(name, rule);

                if (locallyScoped === false && !inStScope) {
                    if (this.checkForScopedNodeAfter(rule, nodes, index) === false) {
                        this.diagnostics.warn(rule, processorWarnings.UNSCOPED_ELEMENT(name), {
                            word: name,
                        });
                    } else {
                        locallyScoped = true;
                    }
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

        if (!isRootValid(rule.selectorAst, 'root')) {
            this.diagnostics.warn(rule, processorWarnings.ROOT_AFTER_SPACING());
        }
    }

    protected checkRedeclareSymbol(symbolName: string, node: postcss.Node) {
        const symbol = this.meta.mappedSymbols[symbolName];
        if (symbol) {
            this.diagnostics.warn(node, processorWarnings.REDECLARE_SYMBOL(symbolName), {
                word: symbolName,
            });
        }
    }

    protected checkRedeclareKeyframes(symbolName: string, node: postcss.Node) {
        const symbol = this.meta.mappedKeyframes[symbolName];
        if (symbol) {
            this.diagnostics.warn(node, processorWarnings.REDECLARE_SYMBOL_KEYFRAMES(symbolName), {
                word: symbolName,
            });
        }
        return symbol;
    }

    protected checkForScopedNodeAfter(rule: postcss.Rule, nodes: SelectorAstNode[], index: number) {
        for (let i = index + 1; i < nodes.length; i++) {
            const element = nodes[i];
            if (!element) {
                break;
            }
            if (element.type === 'spacing' || element.type === 'operator') {
                break;
            }
            if (element.type === 'class') {
                this.addClassSymbolOnce(element.name, rule);

                if (this.meta.classes[element.name]) {
                    if (!this.meta.classes[element.name].alias) {
                        return true;
                    }
                }
            }
        }
        return false;
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
                alias,
            };

            this.meta.simpleSelectors[name] = {
                node: rule,
                symbol: this.meta.elements[name],
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
                alias,
            };

            this.meta.simpleSelectors[name] = {
                node: rule,
                symbol: this.meta.mappedSymbols[name] as ClassSymbol,
            };
        } else if (name === this.meta.root && !this.meta.simpleSelectors[name]) {
            // special handling for registering "root" node comments
            this.meta.simpleSelectors[name] = {
                node: rule,
                symbol: this.meta.classes[name],
            };
        }
    }

    protected addImportSymbols(importDef: Imported) {
        this.checkForInvalidAsUsage(importDef);
        if (importDef.defaultExport) {
            this.checkRedeclareSymbol(importDef.defaultExport, importDef.rule);
            this.meta.mappedSymbols[importDef.defaultExport] = {
                _kind: 'import',
                type: 'default',
                name: 'default',
                import: importDef,
                context: this.dirContext,
            };
        }
        Object.keys(importDef.named).forEach((name) => {
            this.checkRedeclareSymbol(name, importDef.rule);
            this.meta.mappedSymbols[name] = {
                _kind: 'import',
                type: 'named',
                name: importDef.named[name],
                import: importDef,
                context: this.dirContext,
            };
        });
        Object.keys(importDef.keyframes).forEach((name) => {
            if (!this.checkRedeclareKeyframes(name, importDef.rule)) {
                this.meta.mappedKeyframes[name] = {
                    _kind: 'keyframes',
                    alias: name,
                    name: importDef.keyframes[name],
                    import: importDef,
                };
            }
        });
    }

    protected addVarSymbols(rule: postcss.Rule) {
        rule.walkDecls((decl) => {
            this.collectUrls(decl);
            this.handleStFunctions(decl);
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
                valueType: type,
            };
            this.meta.vars.push(varSymbol);
            this.meta.mappedSymbols[decl.prop] = varSymbol;
        });
        rule.remove();
    }

    protected handleCSSVarUse(decl: postcss.Declaration) {
        const parsed = postcssValueParser(decl.value);
        parsed.walk((node) => {
            if (node.type === 'function' && node.value === 'var' && node.nodes) {
                const varName = node.nodes[0];
                if (!validateAllowedNodesUntil(node, 1)) {
                    const args = postcssValueParser.stringify(node.nodes);
                    this.diagnostics.warn(decl, processorWarnings.ILLEGAL_CSS_VAR_ARGS(args), {
                        word: args,
                    });
                }

                this.addCSSVar(postcssValueParser.stringify(varName).trim(), decl);
            }
        });
    }

    protected addCSSVarDefinition(node: postcss.Declaration | postcss.AtRule) {
        const varName = node.type === 'atrule' ? node.params : node.prop;
        this.addCSSVar(varName.trim(), node);
    }

    protected addCSSVar(varName: string, node: postcss.Declaration | postcss.AtRule) {
        if (isCSSVarProp(varName)) {
            if (!this.meta.cssVars[varName]) {
                const cssVarSymbol: CSSVarSymbol = {
                    _kind: 'cssVar',
                    name: varName,
                };
                this.meta.cssVars[varName] = cssVarSymbol;
                if (!this.meta.mappedSymbols[varName]) {
                    this.meta.mappedSymbols[varName] = cssVarSymbol;
                }
            }
        } else {
            this.diagnostics.warn(node, processorWarnings.ILLEGAL_CSS_VAR_USE(varName), {
                word: varName,
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
        } else if (decl.prop === valueMapping.mixin || decl.prop === valueMapping.partialMixin) {
            const mixins: RefedMixin[] = [];
            SBTypesParsers[decl.prop](
                decl,
                (type) => {
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
            ).forEach((mixin) => {
                const mixinRefSymbol = this.meta.mappedSymbols[mixin.type];
                if (
                    mixinRefSymbol &&
                    (mixinRefSymbol._kind === 'import' || mixinRefSymbol._kind === 'class')
                ) {
                    if (mixin.partial && Object.keys(mixin.options).length === 0) {
                        this.diagnostics.warn(
                            decl,
                            processorWarnings.PARTIAL_MIXIN_MISSING_ARGUMENTS(mixin.type),
                            {
                                word: mixin.type,
                            }
                        );
                    }
                    const refedMixin = {
                        mixin,
                        ref: mixinRefSymbol,
                    };
                    mixins.push(refedMixin);
                    this.meta.mixins.push(refedMixin);
                } else {
                    this.diagnostics.warn(decl, processorWarnings.UNKNOWN_MIXIN(mixin.type), {
                        word: mixin.type,
                    });
                }
            });

            if (rule.mixins) {
                const partials = rule.mixins.filter((r) => r.mixin.partial);
                const nonPartials = rule.mixins.filter((r) => !r.mixin.partial);
                const isInPartial = decl.prop === valueMapping.partialMixin;
                if (
                    (partials.length && decl.prop === valueMapping.partialMixin) ||
                    (nonPartials.length && decl.prop === valueMapping.mixin)
                ) {
                    this.diagnostics.warn(decl, processorWarnings.OVERRIDE_MIXIN(decl.prop));
                }
                if (partials.length && nonPartials.length) {
                    rule.mixins = isInPartial
                        ? nonPartials.concat(mixins)
                        : partials.concat(mixins);
                } else if (partials.length) {
                    rule.mixins = isInPartial ? mixins : partials.concat(mixins);
                } else if (nonPartials.length) {
                    rule.mixins = isInPartial ? nonPartials.concat(mixins) : mixins;
                }
            } else if (mixins.length) {
                rule.mixins = mixins;
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
                word: name,
            });
        }
        if (typedRule) {
            typedRule[key] = value;
        }
    }
    protected handleStImport(atRule: postcss.AtRule) {
        const importObj: Imported = {
            defaultExport: '',
            from: '',
            request: '',
            named: {},
            rule: atRule,
            context: this.dirContext,
            keyframes: {},
        };
        const imports = tokenizeImports(`import ${atRule.params}`, '[', ']', true)[0];

        if (imports && imports.star) {
            this.diagnostics.error(atRule, processorWarnings.ST_IMPORT_STAR());
        } else {
            importObj.defaultExport = imports.defaultName || '';
            setImportObjectFrom(imports.from || '', this.dirContext, importObj);

            if (imports.tagged?.keyframes) {
                // importObj.keyframes = imports.tagged?.keyframes;
                for (const [impName, impAsName] of Object.entries(imports.tagged.keyframes)) {
                    importObj.keyframes[impAsName] = impName;
                }
            }
            if (imports.named) {
                for (const [impName, impAsName] of Object.entries(imports.named)) {
                    importObj.named[impAsName] = impName;
                }
            }

            if (imports.errors.length) {
                this.diagnostics.error(
                    atRule,
                    processorWarnings.INVALID_ST_IMPORT_FORMAT(imports.errors)
                );
            } else if (!imports.from?.trim()) {
                this.diagnostics.error(atRule, processorWarnings.ST_IMPORT_EMPTY_FROM());
            }
        }

        atRule.remove();

        return importObj;
    }

    private handleScope(atRule: postcss.AtRule) {
        const scopingRule = postcss.rule({ selector: atRule.params }) as SRule;
        this.handleRule(scopingRule, true);
        validateScopingSelector(atRule, scopingRule, this.diagnostics);

        if (scopingRule.selector) {
            atRule.walkRules((rule) => {
                const scopedRule = rule.clone({
                    selector: scopeSelector(scopingRule.selector, rule.selector, false).selector,
                });
                (scopedRule as SRule).stScopeSelector = atRule.params;
                rule.replaceWith(scopedRule);
            });
        }

        atRule.replaceWith(atRule.nodes || []);
    }
    private checkForInvalidAsUsage(importDef: Imported) {
        for (const [local, imported] of Object.entries(importDef.named)) {
            if (isCSSVarProp(imported) && !isCSSVarProp(local)) {
                this.diagnostics.warn(
                    importDef.rule,
                    processorWarnings.INVALID_CUSTOM_PROPERTY_AS_VALUE(imported, local)
                );
            }
        }
    }
}

function setImportObjectFrom(importPath: string, dirPath: string, importObj: Imported) {
    if (!path.isAbsolute(importPath) && !importPath.startsWith('.')) {
        importObj.request = importPath;
        importObj.from = importPath;
    } else {
        importObj.request = importPath;
        importObj.from =
            path.posix && path.posix.isAbsolute(dirPath) // browser has no posix methods
                ? path.posix.resolve(dirPath, importPath)
                : path.resolve(dirPath, importPath);
    }
}

export function parsePseudoImport(rule: postcss.Rule, context: string, diagnostics: Diagnostics) {
    let fromExists = false;
    const importObj: Imported = {
        defaultExport: '',
        from: '',
        request: '',
        named: {},
        keyframes: {},
        rule,
        context,
    };

    rule.walkDecls((decl) => {
        switch (decl.prop) {
            case valueMapping.from: {
                const importPath = stripQuotation(decl.value);
                if (!importPath.trim()) {
                    diagnostics.error(decl, processorWarnings.EMPTY_IMPORT_FROM());
                }

                if (fromExists) {
                    diagnostics.warn(rule, processorWarnings.MULTIPLE_FROM_IN_IMPORT());
                }

                setImportObjectFrom(importPath, context, importObj);
                fromExists = true;
                break;
            }
            case valueMapping.default:
                importObj.defaultExport = decl.value;

                if (!isCompRoot(importObj.defaultExport) && importObj.from.match(/\.css$/)) {
                    diagnostics.warn(decl, processorWarnings.DEFAULT_IMPORT_IS_LOWER_CASE(), {
                        word: importObj.defaultExport,
                    });
                }
                break;
            case valueMapping.named:
                {
                    const { keyframesMap, namedMap } = parseNamed(decl.value, decl, diagnostics);
                    importObj.named = namedMap;
                    importObj.keyframes = keyframesMap;
                }
                break;
            default:
                diagnostics.warn(decl, processorWarnings.ILLEGAL_PROP_IN_IMPORT(decl.prop), {
                    word: decl.prop,
                });
                break;
        }
    });

    if (!importObj.from) {
        diagnostics.error(rule, processorWarnings.FROM_PROP_MISSING_IN_IMPORT());
    }
    return importObj;
}

export function validateScopingSelector(
    atRule: postcss.AtRule,
    { selector: scopingSelector }: SRule,
    diagnostics: Diagnostics
) {
    if (!scopingSelector) {
        diagnostics.warn(atRule, processorWarnings.MISSING_SCOPING_PARAM());
    }
}

export function createEmptyMeta(root: postcss.Root, diagnostics: Diagnostics): StylableMeta {
    deprecated(
        'createEmptyMeta is deprecated and will be removed in the next version. Use "new StylableMeta()"'
    );
    return new StylableMeta(root, diagnostics);
}

export function processNamespace(namespace: string, source: string) {
    return namespace + murmurhash3_32_gc(source); // .toString(36);
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
    stScopeSelector?: string;
}

// TODO: maybe put under stylable namespace object in v2
export interface DeclStylableProps {
    sourceValue: string;
}

export interface SDecl extends postcss.Declaration {
    stylable: DeclStylableProps;
}
