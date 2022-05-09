import path from 'path';
import * as postcss from 'postcss';
import { DiagnosticBase, Diagnostics } from './diagnostics';
import { murmurhash3_32_gc } from './murmurhash';
import { knownPseudoClassesWithNestedSelectors } from './native-reserved-lists';
import { StylableMeta } from './stylable-meta';
import {
    ClassSymbol,
    CSSCustomProperty,
    ElementSymbol,
    StylableDirectives,
    STVar,
} from './features';
import { generalDiagnostics } from './features/diagnostics';
import {
    FeatureContext,
    STSymbol,
    STImport,
    STGlobal,
    CSSClass,
    CSSType,
    CSSKeyframes,
} from './features';
import { CUSTOM_SELECTOR_RE, expandCustomSelectors, getAlias } from './stylable-utils';
import { processDeclarationFunctions } from './process-declaration-functions';
import {
    walkSelector,
    isSimpleSelector,
    isInPseudoClassContext,
    isRootValid,
    scopeNestedSelector,
    parseSelectorWithCache,
    stringifySelector,
} from './helpers/selector';
import { isChildOfAtRule } from './helpers/rule';
import { SBTypesParsers } from './stylable-value-parsers';
import { stripQuotation, filename2varname } from './helpers/string';
// ToDo: remove when moving st-scope to transformer
import type { SRule } from './deprecated/postcss-ast-extension';

const parseStates = SBTypesParsers[`-st-states`];
const parseGlobal = SBTypesParsers[`-st-global`];
const parseExtends = SBTypesParsers[`-st-extends`];

const stValuesMap = {
    '-st-from': true,
    '-st-named': true,
    '-st-default': true,
    '-st-root': true,
    '-st-states': true,
    '-st-extends': true,
    '-st-mixin': true,
    '-st-partial-mixin': true,
    '-st-global': true,
} as const;

export const processorDiagnostics = {
    ROOT_AFTER_SPACING(): DiagnosticBase {
        return {
            code: '11001',
            message:
                '".root" class cannot be used after native elements or selectors external to the stylesheet',
            severity: 'warning',
        };
    },
    STATE_DEFINITION_IN_ELEMENT(): DiagnosticBase {
        return {
            code: '11002',
            message: 'cannot define pseudo states inside a type selector',
            severity: 'error',
        };
    },
    STATE_DEFINITION_IN_COMPLEX(): DiagnosticBase {
        return {
            code: '11003',
            message: 'cannot define pseudo states inside complex selectors',
            severity: 'error',
        };
    },
    CANNOT_RESOLVE_EXTEND(name: string): DiagnosticBase {
        return {
            code: '11004',
            message: `cannot resolve '-st-extends' type for '${name}'`,
            severity: 'error',
        };
    },
    CANNOT_EXTEND_IN_COMPLEX(): DiagnosticBase {
        return {
            code: '11005',
            message: `cannot define "-st-extends" inside a complex selector`,
            severity: 'error',
        };
    },
    OVERRIDE_TYPED_RULE(key: string, name: string): DiagnosticBase {
        return {
            code: '11006',
            message: `override "${key}" on typed rule "${name}"`,
            severity: 'warning',
        };
    },
    INVALID_NAMESPACE_DEF(): DiagnosticBase {
        return {
            code: '11007',
            message: 'invalid @namespace',
            severity: 'error',
        };
    },
    EMPTY_NAMESPACE_DEF(): DiagnosticBase {
        return {
            code: '11008',
            message: '@namespace must contain at least one character or digit',
            severity: 'error',
        };
    },
    MISSING_SCOPING_PARAM(): DiagnosticBase {
        return {
            code: '11009',
            message: '"@st-scope" missing scoping selector parameter',
            severity: 'error',
        };
    },
    INVALID_NAMESPACE_REFERENCE(): DiagnosticBase {
        return {
            code: '11010',
            message: 'st-namespace-reference dose not have any value',
            severity: 'error',
        };
    },
    INVALID_NESTING(child: string, parent: string): DiagnosticBase {
        return {
            code: '11011',
            message: `nesting of rules within rules is not supported, found: "${child}" inside "${parent}"`,
            severity: 'error',
        };
    },
};

export class StylableProcessor implements FeatureContext {
    public meta!: StylableMeta;

    constructor(
        public diagnostics = new Diagnostics(),
        private resolveNamespace = processNamespace
    ) {}
    public process(root: postcss.Root): StylableMeta {
        this.meta = new StylableMeta(root, this.diagnostics);

        STImport.hooks.analyzeInit(this);
        CSSCustomProperty.hooks.analyzeInit(this);

        this.handleAtRules(root);

        const stubs = this.insertCustomSelectorsStubs();

        root.walkRules((rule) => {
            if (!isChildOfAtRule(rule, 'keyframes')) {
                this.handleCustomSelectors(rule);
                this.handleRule(rule, isChildOfAtRule(rule, `st-scope`));
            }
            const parent = rule.parent;
            if (parent?.type === 'rule') {
                this.diagnostics.report(
                    processorDiagnostics.INVALID_NESTING(
                        rule.selector,
                        (parent as postcss.Rule).selector
                    ),
                    { node: rule }
                );
            }
        });

        root.walkDecls((decl) => {
            // ToDo: refactor to be hooked by features
            if (decl.prop in stValuesMap) {
                this.handleDirectives(decl.parent as postcss.Rule, decl);
            }
            CSSCustomProperty.hooks.analyzeDeclaration({ context: this, decl });

            this.collectUrls(decl);
        });

        stubs.forEach((s) => s && s.remove());

        this.meta.scopes.forEach((scope) => this.handleScope(scope));

        STSymbol.reportRedeclare(this);

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
        const toRemove: postcss.AtRule[] = [];

        root.walkAtRules((atRule) => {
            switch (atRule.name) {
                case 'st-import': {
                    STImport.hooks.analyzeAtRule({
                        context: this,
                        atRule,
                        toRemove,
                    });
                    break;
                }
                case 'namespace': {
                    const match = atRule.params.match(/["'](.*?)['"]/);
                    if (match) {
                        if (match[1].trim()) {
                            namespace = match[1];
                        } else {
                            this.diagnostics.report(processorDiagnostics.EMPTY_NAMESPACE_DEF(), {
                                node: atRule,
                            });
                        }
                        toRemove.push(atRule);
                    } else {
                        this.diagnostics.report(processorDiagnostics.INVALID_NAMESPACE_DEF(), {
                            node: atRule,
                        });
                    }
                    break;
                }
                case 'keyframes':
                    CSSKeyframes.hooks.analyzeAtRule({
                        context: this,
                        atRule,
                        toRemove,
                    });
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
                case 'property':
                case 'st-global-custom-property': {
                    CSSCustomProperty.hooks.analyzeAtRule({ context: this, atRule, toRemove });
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

    private handleNamespaceReference(namespace: string): string {
        let pathToSource: string | undefined;
        let length = this.meta.ast.nodes.length;

        while (length--) {
            const node = this.meta.ast.nodes[length];
            if (node.type === 'comment' && node.text.includes('st-namespace-reference')) {
                const i = node.text.indexOf('=');
                if (i === -1) {
                    this.diagnostics.report(processorDiagnostics.INVALID_NAMESPACE_REFERENCE(), {
                        node,
                    });
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

    protected handleRule(rule: postcss.Rule, inStScope = false) {
        const selectorAst = parseSelectorWithCache(rule.selector);

        let locallyScoped = false;
        walkSelector(selectorAst, (node, ...nodeContext) => {
            const [index, nodes, parents] = nodeContext;
            const type = node.type;
            if (type === 'selector' && !isInPseudoClassContext(parents)) {
                locallyScoped = false;
            }

            if (node.type === 'pseudo_class') {
                if (node.value === 'import') {
                    STImport.hooks.analyzeSelectorNode({
                        context: this,
                        node,
                        rule,
                        walkContext: nodeContext,
                    });
                } else if (node.value === 'vars') {
                    return STVar.hooks.analyzeSelectorNode({
                        context: this,
                        node,
                        rule,
                        walkContext: nodeContext,
                    });
                } else if (node.value === `global`) {
                    return STGlobal.hooks.analyzeSelectorNode({
                        context: this,
                        node,
                        rule,
                        walkContext: nodeContext,
                    });
                } else if (!knownPseudoClassesWithNestedSelectors.includes(node.value)) {
                    return walkSelector.skipNested;
                }
            } else if (node.type === 'class') {
                CSSClass.hooks.analyzeSelectorNode({
                    context: this,
                    node,
                    rule,
                    walkContext: nodeContext,
                });

                locallyScoped = CSSClass.validateClassScoping({
                    context: this,
                    classSymbol: CSSClass.get(this.meta, node.value)!,
                    locallyScoped,
                    inStScope,
                    node,
                    nodes,
                    index,
                    rule,
                });
            } else if (node.type === 'type') {
                CSSType.hooks.analyzeSelectorNode({
                    context: this,
                    node,
                    rule,
                    walkContext: nodeContext,
                });

                locallyScoped = CSSType.validateTypeScoping({
                    context: this,
                    locallyScoped,
                    inStScope,
                    node,
                    nodes,
                    index,
                    rule,
                });
            } else if (node.type === `id`) {
                if (node.nodes) {
                    this.diagnostics.report(
                        generalDiagnostics.INVALID_FUNCTIONAL_SELECTOR(`.` + node.value, `id`),
                        {
                            filePath: this.meta.source,
                            node: rule,
                            options: { word: stringifySelector(node) },
                        }
                    );
                }
            } else if (node.type === `attribute`) {
                if (node.nodes) {
                    this.diagnostics.report(
                        generalDiagnostics.INVALID_FUNCTIONAL_SELECTOR(
                            `.` + node.value,
                            `attribute`
                        ),
                        {
                            filePath: this.meta.source,
                            node: rule,
                            options: { word: stringifySelector(node) },
                        }
                    );
                }
            } else if (node.type === `nesting`) {
                if (node.nodes) {
                    this.diagnostics.report(
                        generalDiagnostics.INVALID_FUNCTIONAL_SELECTOR(`.` + node.value, `nesting`),
                        {
                            filePath: this.meta.source,
                            node: rule,
                            options: { word: stringifySelector(node) },
                        }
                    );
                }
            }
            return;
        });

        // ToDo: check cases of root in nested selectors?
        if (!isRootValid(selectorAst)) {
            this.diagnostics.report(processorDiagnostics.ROOT_AFTER_SPACING(), { node: rule });
        }
    }

    protected handleDirectives(rule: postcss.Rule, decl: postcss.Declaration) {
        const isSimplePerSelector = isSimpleSelector(rule.selector);
        const type = isSimplePerSelector.reduce((accType, { type }) => {
            return !accType ? type : accType !== type ? `complex` : type;
        }, `` as typeof isSimplePerSelector[number]['type']);
        const isSimple = type !== `complex`;
        if (decl.prop === `-st-states`) {
            if (isSimple && type !== 'type') {
                this.extendTypedRule(
                    decl,
                    rule.selector,
                    `-st-states`,
                    parseStates(decl.value, decl, this.diagnostics)
                );
            } else {
                if (type === 'type') {
                    this.diagnostics.report(processorDiagnostics.STATE_DEFINITION_IN_ELEMENT(), {
                        node: decl,
                    });
                } else {
                    this.diagnostics.report(processorDiagnostics.STATE_DEFINITION_IN_COMPLEX(), {
                        node: decl,
                    });
                }
            }
        } else if (decl.prop === `-st-extends`) {
            if (isSimple) {
                const parsed = parseExtends(decl.value);
                const symbolName = parsed.types[0] && parsed.types[0].symbolName;

                const extendsRefSymbol = STSymbol.get(this.meta, symbolName)!;
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
                        `-st-extends`,
                        getAlias(extendsRefSymbol) || extendsRefSymbol
                    );
                } else {
                    this.diagnostics.report(
                        processorDiagnostics.CANNOT_RESOLVE_EXTEND(decl.value),
                        {
                            node: decl,
                            options: { word: decl.value },
                        }
                    );
                }
            } else {
                this.diagnostics.report(processorDiagnostics.CANNOT_EXTEND_IN_COMPLEX(), {
                    node: decl,
                });
            }
        } else if (decl.prop === `-st-global`) {
            if (isSimple && type !== 'type') {
                this.setClassGlobalMapping(decl, rule);
            } else {
                // TODO: diagnostics - scoped on none class
            }
        }
    }

    protected setClassGlobalMapping(decl: postcss.Declaration, rule: postcss.Rule) {
        const name = rule.selector.replace('.', '');
        const classSymbol = CSSClass.get(this.meta, name);
        if (classSymbol) {
            const globalSelectorAst = parseGlobal(decl, this.diagnostics);
            if (globalSelectorAst) {
                classSymbol[`-st-global`] = globalSelectorAst;
            }
        }
    }

    protected extendTypedRule(
        node: postcss.Node,
        selector: string,
        key: keyof StylableDirectives,
        value: any
    ) {
        const name = selector.replace('.', '');
        const typedRule = STSymbol.get(this.meta, name) as ClassSymbol | ElementSymbol;
        if (typedRule && typedRule[key]) {
            this.diagnostics.report(processorDiagnostics.OVERRIDE_TYPED_RULE(key, name), {
                node,
                options: {
                    word: name,
                },
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
}

function validateScopingSelector(
    atRule: postcss.AtRule,
    { selector: scopingSelector }: postcss.Rule,
    diagnostics: Diagnostics
) {
    if (!scopingSelector) {
        diagnostics.report(processorDiagnostics.MISSING_SCOPING_PARAM(), { node: atRule });
    }
}

export function processNamespace(namespace: string, source: string) {
    return namespace + murmurhash3_32_gc(source); // .toString(36);
}
