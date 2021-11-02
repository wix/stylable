import path from 'path';
import * as postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import { deprecatedStFunctions } from './custom-values';
import { Diagnostics } from './diagnostics';
import { parseSelector as deprecatedParseSelector } from './deprecated/deprecated-selector-utils';
import { murmurhash3_32_gc } from './murmurhash';
import { reservedKeyFrames } from './native-reserved-lists';
import { StylableMeta } from './stylable-meta';
import type {
    ClassSymbol,
    CSSVarSymbol,
    ElementSymbol,
    Imported,
    RefedMixin,
    StylableDirectives,
    VarSymbol,
} from './features';
import { generalDiagnostics } from './features/diagnostics';
import { STSymbol, CSSClass, CSSType, STPart } from './features';
import {
    CUSTOM_SELECTOR_RE,
    expandCustomSelectors,
    getAlias,
    isCSSVarProp,
} from './stylable-utils';
import { processDeclarationFunctions } from './process-declaration-functions';
import {
    walkSelector,
    isSimpleSelector,
    isInPseudoClassContext,
    isRootValid,
    isCompRoot,
    scopeNestedSelector,
    parseSelectorWithCache,
    stringifySelector,
} from './helpers/selector';
import { isChildOfAtRule } from './helpers/rule';
import type { SRule } from './deprecated/postcss-ast-extension';
import {
    paramMapping,
    rootValueMapping,
    SBTypesParsers,
    stValuesMap,
    validateAllowedNodesUntil,
    valueMapping,
} from './stylable-value-parsers';
import { deprecated, filename2varname, globalValue, stripQuotation } from './utils';
import { ignoreDeprecationWarn } from './helpers/deprecation';
import { validateAtProperty } from './validate-at-property';
import { parsePseudoImport, parseStImport } from './stylable-imports-tools';
export * from './stylable-meta'; /* TEMP EXPORT */

const parseStates = SBTypesParsers[valueMapping.states];
const parseGlobal = SBTypesParsers[valueMapping.global];
const parseExtends = SBTypesParsers[valueMapping.extends];

export const processorWarnings = {
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(name: string) {
        return `cannot define "${name}" inside a complex selector`;
    },
    ROOT_AFTER_SPACING() {
        return '".root" class cannot be used after native elements or selectors external to the stylesheet';
    },
    STATE_DEFINITION_IN_ELEMENT() {
        return 'cannot define pseudo states inside a type selector';
    },
    STATE_DEFINITION_IN_COMPLEX() {
        return 'cannot define pseudo states inside complex selectors';
    },
    ...STSymbol.diagnostics,
    ...CSSClass.diagnostics,
    ...CSSType.diagnostics,
    ...STPart.diagnostics,
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
    INVALID_NAMESPACE_DEF() {
        return 'invalid @namespace';
    },
    EMPTY_NAMESPACE_DEF() {
        return '@namespace must contain at least one character or digit';
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
    ...generalDiagnostics,
    DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY() {
        return `"st-global-custom-property" is deprecated and will be removed in the next version. Use "@property" with ${paramMapping.global}`;
    },
    DEPRECATED_ST_FUNCTION_NAME: (name: string, alternativeName: string) => {
        return `"${name}" is deprecated, use "${alternativeName}"`;
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
                        this.diagnostics.error(atRule, processorWarnings.NO_KEYFRAMES_IN_ST_SCOPE());
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
                case 'st-import': {
                    if (atRule.parent?.type !== 'root') {
                        this.diagnostics.warn(
                            atRule,
                            processorWarnings.NO_ST_IMPORT_IN_NESTED_SCOPE()
                        );
                        atRule.remove();
                    } else {
                        const stImport = parseStImport(atRule, this.dirContext, this.diagnostics);
                        atRule.remove();
                        this.meta.imports.push(stImport);
                        this.addImportSymbols(stImport);
                    }
                    break;
                }
                case 'property': {
                    this.addCSSVarDefinition(atRule);
                    validateAtProperty(atRule, this.diagnostics);
                    break;
                }
                case 'st-global-custom-property': {
                    this.diagnostics.info(
                        atRule,
                        processorWarnings.DEPRECATED_ST_GLOBAL_CUSTOM_PROPERTY()
                    );

                    const cssVarsByComma = atRule.params.split(',');
                    const cssVarsBySpacing = atRule.params
                        .trim()
                        .split(/\s+/g)
                        .filter((s) => s !== ',');

                    if (cssVarsBySpacing.length > cssVarsByComma.length) {
                        this.diagnostics.warn(
                            atRule,
                            processorWarnings.GLOBAL_CSS_VAR_MISSING_COMMA(atRule.params),
                            {
                                word: atRule.params,
                            }
                        );
                        break;
                    }

                    for (const entry of cssVarsByComma) {
                        const cssVar = entry.trim();

                        if (isCSSVarProp(cssVar)) {
                            const property: CSSVarSymbol = {
                                _kind: 'cssVar',
                                name: cssVar,
                                global: true,
                            };

                            this.meta.cssVars[cssVar] = property;
                            this.meta.mappedSymbols[cssVar] = property;
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
        rule.selectorAst = deprecatedParseSelector(rule.selector);

        const selectorAst = parseSelectorWithCache(rule.selector);

        let locallyScoped = false;
        let simpleSelector: boolean;
        walkSelector(selectorAst, (node, ...nodeContext) => {
            const [index, nodes, parents] = nodeContext;
            const type = node.type;
            if (type === 'selector' && !isInPseudoClassContext(parents)) {
                locallyScoped = false;
            }
            if (type !== `selector` && type !== `class` && type !== `type`) {
                simpleSelector = false;
            }

            if (node.type === 'pseudo_class') {
                if (node.value === 'import') {
                    if (rule.selector === rootValueMapping.import) {
                        if (isChildOfAtRule(rule, rootValueMapping.stScope)) {
                            this.diagnostics.warn(rule, processorWarnings.NO_IMPORT_IN_ST_SCOPE());
                            rule.remove();
                            return walkSelector.stopAll;
                        }
                        rule.remove();
                        return walkSelector.stopAll;
                    } else {
                        this.diagnostics.warn(
                            rule,
                            processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(
                                rootValueMapping.import
                            )
                        );
                    }
                } else if (node.value === 'vars') {
                    if (rule.selector === rootValueMapping.vars) {
                        if (isChildOfAtRule(rule, rootValueMapping.stScope)) {
                            this.diagnostics.warn(
                                rule,
                                processorWarnings.NO_VARS_DEF_IN_ST_SCOPE()
                            );
                            rule.remove();
                            return walkSelector.stopAll;
                        }

                        this.addVarSymbols(rule);
                        return walkSelector.stopAll;
                    } else {
                        this.diagnostics.warn(
                            rule,
                            processorWarnings.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(
                                rootValueMapping.vars
                            )
                        );
                    }
                } else if (node.value === `global`) {
                    return walkSelector.skipNested;
                }
            } else if (node.type === 'class') {
                STPart.hooks.analyzeSelectorNode(this.meta, node, rule, nodeContext);

                locallyScoped = CSSClass.validateClassScoping(this.meta, {
                    classSymbol: CSSClass.getClass(this.meta, node.value)!,
                    locallyScoped,
                    inStScope,
                    node,
                    nodes,
                    index,
                    rule,
                });
            } else if (node.type === 'type') {
                STPart.hooks.analyzeSelectorNode(this.meta, node, rule, nodeContext);

                locallyScoped = CSSType.validateTypeScoping(this.meta, {
                    locallyScoped,
                    inStScope,
                    node,
                    nodes,
                    index,
                    rule,
                });
            } else if (node.type === `id`) {
                if (node.nodes) {
                    this.diagnostics.error(
                        rule,
                        processorWarnings.INVALID_FUNCTIONAL_SELECTOR(`#` + node.value, `id`),
                        {
                            word: stringifySelector(node),
                        }
                    );
                }
            } else if (node.type === `attribute`) {
                if (node.nodes) {
                    this.diagnostics.error(
                        rule,
                        processorWarnings.INVALID_FUNCTIONAL_SELECTOR(
                            `[${node.value}]`,
                            `attribute`
                        ),
                        {
                            word: stringifySelector(node),
                        }
                    );
                }
            } else if (node.type === `nesting`) {
                if (node.nodes) {
                    this.diagnostics.error(
                        rule,
                        processorWarnings.INVALID_FUNCTIONAL_SELECTOR(node.value, `nesting`),
                        {
                            word: stringifySelector(node),
                        }
                    );
                }
            }
            return;
        });

        if (simpleSelector! !== false) {
            rule.isSimpleSelector = true;
            rule.selectorType = rule.selector.match(/^\./) ? 'class' : 'element';
        } else {
            rule.selectorType = 'complex';
        }

        // ToDo: check cases of root in nested selectors?
        if (!isRootValid(selectorAst)) {
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

                this.addCSSVar(postcssValueParser.stringify(varName).trim(), decl, false);
            }
        });
    }

    protected addCSSVarDefinition(node: postcss.Declaration | postcss.AtRule) {
        let varName = node.type === 'atrule' ? node.params.trim() : node.prop.trim();
        let isGlobal = false;

        const globalVarName = globalValue(varName);

        if (globalVarName !== undefined) {
            varName = globalVarName.trim();
            isGlobal = true;
        }

        if (node.type === 'atrule') {
            this.checkRedeclareSymbol(varName, node);
        }

        this.addCSSVar(varName, node, isGlobal);
    }

    protected addCSSVar(
        varName: string,
        node: postcss.Declaration | postcss.AtRule,
        global: boolean
    ) {
        if (isCSSVarProp(varName)) {
            if (!this.meta.cssVars[varName]) {
                const cssVarSymbol: CSSVarSymbol = {
                    _kind: 'cssVar',
                    name: varName,
                    global,
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
        const isSimplePerSelector = isSimpleSelector(rule.selector);
        const type = isSimplePerSelector.reduce((accType, { type }) => {
            return !accType ? type : accType !== type ? `complex` : type;
        }, `` as typeof isSimplePerSelector[number]['type']);
        const isSimple = type !== `complex`;
        if (decl.prop === valueMapping.states) {
            if (isSimple && type !== 'type') {
                this.extendTypedRule(
                    decl,
                    rule.selector,
                    valueMapping.states,
                    parseStates(decl.value, decl, this.diagnostics)
                );
            } else {
                if (type === 'type') {
                    this.diagnostics.warn(decl, processorWarnings.STATE_DEFINITION_IN_ELEMENT());
                } else {
                    this.diagnostics.warn(decl, processorWarnings.STATE_DEFINITION_IN_COMPLEX());
                }
            }
        } else if (decl.prop === valueMapping.extends) {
            if (isSimple) {
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
            /**
             * This functionality is broken we don't know what strategy to choose here.
             * Should be fixed when we refactor to the new flow
             */
            SBTypesParsers[decl.prop](
                decl,
                (type) => {
                    const symbol = this.meta.mappedSymbols[type];
                    return symbol?._kind === 'import' && !symbol.import.from.match(/.css$/)
                        ? 'args'
                        : 'named';
                },
                this.diagnostics,
                false
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
                    ignoreDeprecationWarn(() => this.meta.mixins).push(refedMixin);
                } else {
                    this.diagnostics.warn(decl, processorWarnings.UNKNOWN_MIXIN(mixin.type), {
                        word: mixin.type,
                    });
                }
            });

            const previousMixins = ignoreDeprecationWarn(() => rule.mixins);
            if (previousMixins) {
                const partials = previousMixins.filter((r) => r.mixin.partial);
                const nonPartials = previousMixins.filter((r) => !r.mixin.partial);
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
            if (isSimple && type !== 'type') {
                this.setClassGlobalMapping(decl, rule);
            } else {
                // TODO: diagnostics - scoped on none class
            }
        }
    }

    protected setClassGlobalMapping(decl: postcss.Declaration, rule: postcss.Rule) {
        const name = rule.selector.replace('.', '');
        const classSymbol = CSSClass.getClass(this.meta, name);
        if (classSymbol) {
            classSymbol[valueMapping.global] = parseGlobal(decl, this.diagnostics);
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

    private handleScope(atRule: postcss.AtRule) {
        const scopingRule = postcss.rule({ selector: atRule.params }) as SRule;
        this.handleRule(scopingRule, true);
        validateScopingSelector(atRule, scopingRule, this.diagnostics);

        if (scopingRule.selector) {
            atRule.walkRules((rule) => {
                const scopedRule = rule.clone({
                    selector: scopeNestedSelector(
                        parseSelectorWithCache(scopingRule.selector),
                        parseSelectorWithCache(rule.selector)
                    ).selector,
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
