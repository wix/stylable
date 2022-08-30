import type * as postcss from 'postcss';
import { createDiagnosticReporter, Diagnostics } from './diagnostics';
import { knownPseudoClassesWithNestedSelectors } from './native-reserved-lists';
import { StylableMeta } from './stylable-meta';
import {
    ClassSymbol,
    CSSCustomProperty,
    ElementSymbol,
    StylableDirectives,
    STVar,
    STCustomSelector,
} from './features';
import { generalDiagnostics } from './features/diagnostics';
import {
    FeatureContext,
    STSymbol,
    STModule,
    STNamespace,
    STGlobal,
    STScope,
    CSSClass,
    CSSType,
    CSSKeyframes,
    CSSLayer,
} from './features';
import { getAlias } from './stylable-utils';
import { processDeclarationFunctions } from './process-declaration-functions';
import {
    walkSelector,
    isSimpleSelector,
    isInPseudoClassContext,
    parseSelectorWithCache,
    stringifySelector,
} from './helpers/selector';
import { isChildOfAtRule } from './helpers/rule';
import { SBTypesParsers } from './stylable-value-parsers';

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
    STATE_DEFINITION_IN_ELEMENT: createDiagnosticReporter(
        '11002',
        'error',
        () => 'cannot define pseudo states inside a type selector'
    ),
    STATE_DEFINITION_IN_COMPLEX: createDiagnosticReporter(
        '11003',
        'error',
        () => 'cannot define pseudo states inside complex selectors'
    ),
    CANNOT_RESOLVE_EXTEND: createDiagnosticReporter(
        '11004',
        'error',
        (name: string) => `cannot resolve '-st-extends' type for '${name}'`
    ),
    CANNOT_EXTEND_IN_COMPLEX: createDiagnosticReporter(
        '11005',
        'error',
        () => `cannot define "-st-extends" inside a complex selector`
    ),
    OVERRIDE_TYPED_RULE: createDiagnosticReporter(
        '11006',
        'warning',
        (key: string, name: string) => `override "${key}" on typed rule "${name}"`
    ),
    INVALID_NESTING: createDiagnosticReporter(
        '11011',
        'error',
        (child: string, parent: string) =>
            `nesting of rules within rules is not supported, found: "${child}" inside "${parent}"`
    ),
};

export class StylableProcessor implements FeatureContext {
    public meta!: StylableMeta;
    constructor(
        public diagnostics = new Diagnostics(),
        private resolveNamespace = STNamespace.defaultProcessNamespace
    ) {}
    public process(root: postcss.Root): StylableMeta {
        this.meta = new StylableMeta(root, this.diagnostics);

        STModule.hooks.analyzeInit(this);
        CSSCustomProperty.hooks.analyzeInit(this);

        this.handleAtRules(root);

        root.walkRules((rule) => {
            if (!isChildOfAtRule(rule, 'keyframes')) {
                this.handleRule(rule, {
                    isScoped: isChildOfAtRule(rule, `st-scope`),
                    reportUnscoped: true,
                });
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
            const parent = decl.parent as postcss.ChildNode;
            if (parent.type === 'rule' && parent.selector === ':vars') {
                // ToDo: remove once
                // - custom property definition is allowed in var value
                // - url collection is removed from st-var
                return;
            }
            // ToDo: refactor to be hooked by features
            if (decl.prop in stValuesMap && parent.type === 'rule') {
                this.handleDirectives(parent, decl);
            }
            CSSCustomProperty.hooks.analyzeDeclaration({ context: this, decl });

            this.collectUrls(decl);
        });
        STCustomSelector.hooks.analyzeDone(this);

        STNamespace.setMetaNamespace(this, this.resolveNamespace);

        STSymbol.reportRedeclare(this);

        return this.meta;
    }

    protected handleAtRules(root: postcss.Root) {
        const analyzeRule = (rule: postcss.Rule, { isScoped }: { isScoped: boolean }) => {
            return this.handleRule(rule, {
                isScoped,
                reportUnscoped: false,
            });
        };

        root.walkAtRules((atRule) => {
            switch (atRule.name) {
                case 'st-import': {
                    STModule.hooks.analyzeAtRule({
                        context: this,
                        atRule,
                        analyzeRule,
                    });
                    break;
                }
                case 'namespace':
                case 'st-namespace': {
                    STNamespace.hooks.analyzeAtRule({
                        context: this,
                        atRule,
                        analyzeRule,
                    });
                    break;
                }
                case 'keyframes':
                    CSSKeyframes.hooks.analyzeAtRule({
                        context: this,
                        atRule,
                        analyzeRule,
                    });
                    break;
                case 'layer':
                    CSSLayer.hooks.analyzeAtRule({
                        context: this,
                        atRule,
                        analyzeRule,
                    });
                    break;
                case 'import':
                    CSSLayer.hooks.analyzeAtRule({
                        context: this,
                        atRule,
                        analyzeRule,
                    });
                    break;
                case 'custom-selector': {
                    STCustomSelector.hooks.analyzeAtRule({
                        context: this,
                        atRule,
                        analyzeRule,
                    });
                    break;
                }
                case 'st-scope':
                    STScope.hooks.analyzeAtRule({ context: this, atRule, analyzeRule });
                    break;
                case 'property':
                case 'st-global-custom-property': {
                    CSSCustomProperty.hooks.analyzeAtRule({
                        context: this,
                        atRule,
                        analyzeRule,
                    });
                    break;
                }
            }
        });
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
    protected handleRule(
        rule: postcss.Rule,
        { isScoped, reportUnscoped }: { isScoped: boolean; reportUnscoped: boolean }
    ) {
        const selectorAst = parseSelectorWithCache(rule.selector);

        let locallyScoped = isScoped;

        walkSelector(selectorAst, (node, ...nodeContext) => {
            const [index, nodes, parents] = nodeContext;
            const type = node.type;
            if (type === 'selector' && !isInPseudoClassContext(parents)) {
                // reset scope check between top level selectors
                locallyScoped = isScoped;
            }

            if (node.type === 'pseudo_class') {
                if (node.value === 'import') {
                    STModule.hooks.analyzeSelectorNode({
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
                } else if (node.value.startsWith('--')) {
                    // ToDo: move to css-class feature
                    locallyScoped =
                        locallyScoped ||
                        STCustomSelector.isScoped(this.meta, node.value.slice(2)) ||
                        false;
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
                    reportUnscoped,
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
                    reportUnscoped,
                    node,
                    nodes,
                    index,
                    rule,
                });
            } else if (node.type === `id`) {
                if (node.nodes) {
                    this.diagnostics.report(
                        generalDiagnostics.INVALID_FUNCTIONAL_SELECTOR(`#` + node.value, `id`),
                        {
                            node: rule,
                            word: stringifySelector(node),
                        }
                    );
                }
            } else if (node.type === `attribute`) {
                if (node.nodes) {
                    this.diagnostics.report(
                        generalDiagnostics.INVALID_FUNCTIONAL_SELECTOR(
                            `[${node.value}]`,
                            `attribute`
                        ),
                        {
                            node: rule,
                            word: stringifySelector(node),
                        }
                    );
                }
            } else if (node.type === `nesting`) {
                if (node.nodes) {
                    this.diagnostics.report(
                        generalDiagnostics.INVALID_FUNCTIONAL_SELECTOR(node.value, `nesting`),
                        {
                            node: rule,
                            word: stringifySelector(node),
                        }
                    );
                }
            }
            return;
        });

        return locallyScoped;
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
                            word: decl.value,
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
                word: name,
            });
        }
        if (typedRule) {
            typedRule[key] = value;
        }
    }
}

// ToDo: remove export and reroute import from feature
export const processNamespace = STNamespace.defaultProcessNamespace;
