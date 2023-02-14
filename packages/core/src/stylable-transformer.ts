import isVendorPrefixed from 'is-vendor-prefixed';
import cloneDeep from 'lodash.clonedeep';
import * as postcss from 'postcss';
import type { FileProcessor } from './cached-process-file';
import { createDiagnosticReporter, Diagnostics } from './diagnostics';
import { StylableEvaluator } from './functions';
import { nativePseudoElements } from './native-reserved-lists';
import { parseSelectorWithCache, stringifySelector } from './helpers/selector';
import {
    SelectorNode,
    Selector,
    SelectorList,
    groupCompoundSelectors,
    CompoundSelector,
    splitCompoundSelectors,
    ImmutableSelectorNode,
} from '@tokey/css-selector-parser';
import { isChildOfAtRule } from './helpers/rule';
import { getOriginDefinition } from './helpers/resolve';
import {
    ClassSymbol,
    CSSContains,
    CSSMedia,
    ElementSymbol,
    FeatureTransformContext,
    STNamespace,
} from './features';
import type { StylableMeta } from './stylable-meta';
import {
    STSymbol,
    STImport,
    STGlobal,
    STScope,
    STCustomSelector,
    STVar,
    STMixin,
    CSSClass,
    CSSType,
    CSSPseudoClass,
    CSSKeyframes,
    CSSLayer,
    CSSCustomProperty,
} from './features';
import {
    CSSResolve,
    StylableResolverCache,
    StylableResolver,
    createSymbolResolverWithCache,
} from './stylable-resolver';
import { validateCustomPropertyName } from './helpers/css-custom-property';
import type { ModuleResolver } from './types';
import { getRuleScopeSelector } from './deprecated/postcss-ast-extension';

export interface ResolvedElement {
    name: string;
    type: string;
    resolved: Array<CSSResolve<ClassSymbol | ElementSymbol>>;
}

export type RuntimeStVar = string | { [key: string]: RuntimeStVar } | RuntimeStVar[];

export interface StylableExports {
    classes: Record<string, string>;
    vars: Record<string, string>;
    stVars: Record<string, RuntimeStVar>;
    keyframes: Record<string, string>;
    layers: Record<string, string>;
    containers: Record<string, string>;
}

export interface StylableResults {
    meta: StylableMeta;
    exports: StylableExports;
}

export type replaceValueHook = (
    value: string,
    name: string | { name: string; args: string[] },
    isLocal: boolean,
    passedThrough: string[]
) => string;

export type postProcessor<T = {}> = (
    stylableResults: StylableResults,
    transformer: StylableTransformer
) => StylableResults & T;

export interface TransformHooks {
    postProcessor?: postProcessor;
    replaceValueHook?: replaceValueHook;
}

type EnvMode = 'production' | 'development';

export interface TransformerOptions {
    fileProcessor: FileProcessor<StylableMeta>;
    moduleResolver: ModuleResolver;
    requireModule: (modulePath: string) => any;
    diagnostics: Diagnostics;
    keepValues?: boolean;
    replaceValueHook?: replaceValueHook;
    postProcessor?: postProcessor;
    mode?: EnvMode;
    resolverCache?: StylableResolverCache;
    stVarOverride?: Record<string, string>;
}

export const transformerDiagnostics = {
    UNKNOWN_PSEUDO_ELEMENT: createDiagnosticReporter(
        '12001',
        'error',
        (name: string) => `unknown pseudo element "${name}"`
    ),
};

export class StylableTransformer {
    public fileProcessor: FileProcessor<StylableMeta>;
    public diagnostics: Diagnostics;
    public resolver: StylableResolver;
    public keepValues: boolean;
    public replaceValueHook: replaceValueHook | undefined;
    public postProcessor: postProcessor | undefined;
    public mode: EnvMode;
    private defaultStVarOverride: Record<string, string>;
    private evaluator: StylableEvaluator;
    private getResolvedSymbols: ReturnType<typeof createSymbolResolverWithCache>;
    private directiveNodes: postcss.Declaration[] = [];
    constructor(options: TransformerOptions) {
        this.diagnostics = options.diagnostics;
        this.keepValues = options.keepValues || false;
        this.fileProcessor = options.fileProcessor;
        this.replaceValueHook = options.replaceValueHook;
        this.postProcessor = options.postProcessor;
        this.resolver = new StylableResolver(
            options.fileProcessor,
            options.requireModule,
            options.moduleResolver,
            options.resolverCache || new Map()
        );
        this.mode = options.mode || 'production';
        this.defaultStVarOverride = options.stVarOverride || {};
        this.getResolvedSymbols = createSymbolResolverWithCache(this.resolver, this.diagnostics);
        this.evaluator = new StylableEvaluator({
            valueHook: this.replaceValueHook,
            getResolvedSymbols: this.getResolvedSymbols,
        });
    }
    public transform(meta: StylableMeta): StylableResults {
        const metaExports: StylableExports = {
            classes: {},
            vars: {},
            stVars: {},
            keyframes: {},
            layers: {},
            containers: {},
        };
        meta.transformedScopes = null;
        meta.targetAst = meta.sourceAst.clone();
        const context = {
            meta,
            diagnostics: this.diagnostics,
            resolver: this.resolver,
            evaluator: this.evaluator,
            getResolvedSymbols: this.getResolvedSymbols,
        };
        STImport.hooks.transformInit({ context });
        STGlobal.hooks.transformInit({ context });
        meta.transformedScopes = validateScopes(this, meta);
        this.transformAst(meta.targetAst, meta, metaExports);
        meta.transformDiagnostics = this.diagnostics;
        const result = { meta, exports: metaExports };

        return this.postProcessor ? this.postProcessor(result, this) : result;
    }
    public transformAst(
        ast: postcss.Root,
        meta: StylableMeta,
        metaExports?: StylableExports,
        stVarOverride: Record<string, string> = this.defaultStVarOverride,
        path: string[] = [],
        mixinTransform = false,
        topNestClassName = ``
    ) {
        if (meta.type !== 'stylable') {
            return;
        }
        const { evaluator } = this;

        const prevStVarOverride = evaluator.stVarOverride;
        evaluator.stVarOverride = stVarOverride;

        const transformContext = {
            meta,
            diagnostics: this.diagnostics,
            resolver: this.resolver,
            evaluator,
            getResolvedSymbols: this.getResolvedSymbols,
            passedThrough: path.slice(),
        };
        const transformResolveOptions = {
            context: transformContext,
        };
        prepareAST(transformContext, ast);

        const cssClassResolve = CSSClass.hooks.transformResolve(transformResolveOptions);
        const stVarResolve = STVar.hooks.transformResolve(transformResolveOptions);
        const keyframesResolve = CSSKeyframes.hooks.transformResolve(transformResolveOptions);
        const layerResolve = CSSLayer.hooks.transformResolve(transformResolveOptions);
        const containsResolve = CSSContains.hooks.transformResolve(transformResolveOptions);
        const cssVarsMapping = CSSCustomProperty.hooks.transformResolve(transformResolveOptions);

        const handleAtRule = (atRule: postcss.AtRule) => {
            const { name } = atRule;
            if (name === 'media') {
                CSSMedia.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: {},
                });
            } else if (name === 'property') {
                CSSCustomProperty.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: cssVarsMapping,
                });
            } else if (name === 'keyframes') {
                CSSKeyframes.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: keyframesResolve,
                });
            } else if (name === 'layer') {
                CSSLayer.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: layerResolve,
                });
            } else if (name === 'import') {
                CSSLayer.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: layerResolve,
                });
            } else if (name === 'container') {
                CSSContains.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: containsResolve,
                });
            }
        };
        const handleDeclaration = (decl: postcss.Declaration) => {
            if (validateCustomPropertyName(decl.prop)) {
                CSSCustomProperty.hooks.transformDeclaration({
                    context: transformContext,
                    decl,
                    resolved: cssVarsMapping,
                });
            } else if (decl.prop === `animation` || decl.prop === `animation-name`) {
                CSSKeyframes.hooks.transformDeclaration({
                    context: transformContext,
                    decl,
                    resolved: keyframesResolve,
                });
            } else if (decl.prop === 'container' || decl.prop === 'container-name') {
                CSSContains.hooks.transformDeclaration({
                    context: transformContext,
                    decl,
                    resolved: containsResolve,
                });
            }

            if (this.mode === 'production') {
                if (decl.prop.startsWith('-st-')) {
                    this.directiveNodes.push(decl);
                }
            }

            switch (decl.prop) {
                case `-st-partial-mixin`:
                case `-st-mixin`:
                case `-st-states`:
                    break;
                default:
                    decl.value = this.evaluator.evaluateValue(transformContext, {
                        value: decl.value,
                        meta,
                        node: decl,
                        cssVarsMapping,
                    }).outputValue;
            }
        };

        ast.walk((node) => {
            if (node.type === 'rule') {
                if (isChildOfAtRule(node, 'keyframes')) {
                    return;
                }
                node.selector = this.scopeRule(meta, node, topNestClassName);
            } else if (node.type === 'atrule') {
                handleAtRule(node);
            } else if (node.type === 'decl') {
                handleDeclaration(node);
            }
        });

        if (!mixinTransform && meta.targetAst && this.mode === 'development') {
            CSSClass.addDevRules(transformContext);
        }

        const lastPassParams = {
            context: transformContext,
            ast,
            transformer: this,
            cssVarsMapping,
            path,
        };
        STMixin.hooks.transformLastPass(lastPassParams);
        if (!mixinTransform) {
            STGlobal.hooks.transformLastPass(lastPassParams);
            for (const node of this.directiveNodes) {
                node.remove();
            }
        }

        if (metaExports) {
            CSSClass.hooks.transformJSExports({
                exports: metaExports,
                resolved: cssClassResolve,
            });
            STVar.hooks.transformJSExports({
                exports: metaExports,
                resolved: stVarResolve,
            });
            CSSKeyframes.hooks.transformJSExports({
                exports: metaExports,
                resolved: keyframesResolve,
            });
            CSSLayer.hooks.transformJSExports({
                exports: metaExports,
                resolved: layerResolve,
            });
            CSSContains.hooks.transformJSExports({
                exports: metaExports,
                resolved: containsResolve,
            });
            CSSCustomProperty.hooks.transformJSExports({
                exports: metaExports,
                resolved: cssVarsMapping,
            });
        }

        // restore evaluator state
        this.evaluator.stVarOverride = prevStVarOverride;
    }
    public resolveSelectorElements(meta: StylableMeta, selector: string): ResolvedElement[][] {
        return this.scopeSelector(meta, selector).elements;
    }
    public scopeRule(
        meta: StylableMeta,
        rule: postcss.Rule,
        topNestClassName?: string,
        unwrapGlobals?: boolean
    ): string {
        return this.scopeSelector(meta, rule.selector, rule, topNestClassName, unwrapGlobals)
            .selector;
    }
    public scopeSelector(
        originMeta: StylableMeta,
        selector: string,
        rule?: postcss.Rule,
        topNestClassName?: string,
        unwrapGlobals = false
    ): { selector: string; elements: ResolvedElement[][]; targetSelectorAst: SelectorList } {
        const context = this.createSelectorContext(
            originMeta,
            parseSelectorWithCache(selector, { clone: true }),
            rule || postcss.rule({ selector }),
            topNestClassName
        );
        const targetSelectorAst = this.scopeSelectorAst(context);
        if (unwrapGlobals) {
            STGlobal.unwrapPseudoGlobals(targetSelectorAst);
        }
        return {
            targetSelectorAst,
            selector: stringifySelector(targetSelectorAst),
            elements: context.elements,
        };
    }
    public createSelectorContext(
        meta: StylableMeta,
        selectorAst: SelectorList,
        rule: postcss.Rule,
        topNestClassName?: string
    ) {
        return new ScopeContext(
            meta,
            this.resolver,
            selectorAst,
            rule,
            this.scopeSelectorAst.bind(this),
            topNestClassName
        );
    }
    public scopeSelectorAst(context: ScopeContext): SelectorList {
        const { originMeta, selectorAst } = context;

        // group compound selectors: .a.b .c:hover, a .c:hover -> [[[.a.b], [.c:hover]], [[.a], [.c:hover]]]
        const selectorList = groupCompoundSelectors(selectorAst);
        // resolve meta classes and elements
        const resolvedSymbols = this.getResolvedSymbols(originMeta);
        // set stylesheet root as the global anchor
        if (!context.currentAnchor) {
            context.initRootAnchor({
                name: originMeta.root,
                type: 'class',
                resolved: resolvedSymbols.class[originMeta.root],
            });
        }
        const startedAnchor = context.currentAnchor!;
        // loop over selectors
        for (const selector of selectorList) {
            context.elements.push([]);
            context.selectorIndex++;
            context.selector = selector;
            // loop over nodes
            for (const node of [...selector.nodes]) {
                if (node.type !== `compound_selector`) {
                    continue;
                }
                context.compoundSelector = node;
                // loop over each node in a compound selector
                for (const compoundNode of node.nodes) {
                    context.node = compoundNode;
                    // transform node
                    this.handleCompoundNode(context as Required<ScopeContext>);
                }
            }
            if (selectorList.length - 1 > context.selectorIndex) {
                // reset current anchor
                context.initRootAnchor(startedAnchor);
            }
        }
        // backwards compatibility for elements - empty selector still have an empty first target
        if (selectorList.length === 0) {
            context.elements.push([]);
        }
        const targetAst = splitCompoundSelectors(selectorList);
        context.additionalSelectors.forEach((addSelector) => targetAst.push(addSelector()));
        for (let i = 0; i < targetAst.length; i++) {
            selectorAst[i] = targetAst[i];
        }
        return targetAst;
    }
    private handleCompoundNode(context: Required<ScopeContext>) {
        const { currentAnchor, node, originMeta, topNestClassName } = context;
        const resolvedSymbols = this.getResolvedSymbols(originMeta);
        const transformerContext = {
            meta: originMeta,
            diagnostics: this.diagnostics,
            resolver: this.resolver,
            evaluator: this.evaluator,
            getResolvedSymbols: this.getResolvedSymbols,
        };
        if (node.type === 'class') {
            CSSClass.hooks.transformSelectorNode({
                context: transformerContext,
                selectorContext: context,
                node,
            });
        } else if (node.type === 'type') {
            CSSType.hooks.transformSelectorNode({
                context: transformerContext,
                selectorContext: context,
                node,
            });
        } else if (node.type === 'pseudo_element') {
            if (node.value === ``) {
                // partial psuedo elemennt: `.x::`
                // ToDo: currently the transformer corrects the css without warning,
                // should stylable warn?
                return;
            }
            const len = currentAnchor.resolved.length;
            const lookupStartingPoint = len === 1 /* no extends */ ? 0 : 1;

            let resolved: Array<CSSResolve<ClassSymbol | ElementSymbol>> | undefined;
            for (let i = lookupStartingPoint; i < len; i++) {
                const { symbol, meta } = currentAnchor.resolved[i];
                if (!symbol[`-st-root`]) {
                    continue;
                }
                const isFirstInSelector =
                    context.selectorAst[context.selectorIndex].nodes[0] === node;
                const customSelector = STCustomSelector.getCustomSelectorExpended(meta, node.value);
                if (customSelector) {
                    this.handleCustomSelector(
                        customSelector,
                        meta,
                        context,
                        node.value,
                        node,
                        isFirstInSelector
                    );
                    return;
                }

                const requestedPart = CSSClass.get(meta, node.value);

                if (symbol.alias || !requestedPart) {
                    // skip alias since they cannot add parts
                    continue;
                }

                resolved = this.getResolvedSymbols(meta).class[node.value];

                // first definition of a part in the extends/alias chain
                context.setCurrentAnchor({
                    name: node.value,
                    type: 'pseudo-element',
                    resolved,
                });
                context.setNodeResolve(node, resolved);

                const resolvedPart = getOriginDefinition(resolved);

                if (context.transform) {
                    if (!resolvedPart.symbol[`-st-root`] && !isFirstInSelector) {
                        // insert nested combinator before internal custom element
                        context.insertDescendantCombinatorBeforePseudoElement();
                    }
                    CSSClass.namespaceClass(
                        resolvedPart.meta,
                        resolvedPart.symbol,
                        node,
                        originMeta
                    );
                }
                break;
            }

            if (!resolved) {
                // first definition of a part in the extends/alias chain
                context.setCurrentAnchor({
                    name: node.value,
                    type: 'pseudo-element',
                    resolved: [],
                });
                context.setNodeResolve(node, []);

                if (
                    !nativePseudoElements.includes(node.value) &&
                    !isVendorPrefixed(node.value) &&
                    !context.isDuplicateStScopeDiagnostic()
                ) {
                    this.diagnostics.report(
                        transformerDiagnostics.UNKNOWN_PSEUDO_ELEMENT(node.value),
                        {
                            node: context.rule,
                            word: node.value,
                        }
                    );
                }
            }
        } else if (node.type === 'pseudo_class') {
            CSSPseudoClass.hooks.transformSelectorNode({
                context: transformerContext,
                selectorContext: context,
                node,
            });
        } else if (node.type === `nesting`) {
            if (context.nestingSelectorAnchor) {
                context.setCurrentAnchor(context.nestingSelectorAnchor);
                context.setNodeResolve(node, context.nestingSelectorAnchor.resolved);
            } else {
                /**
                 * although it is always assumed to be class symbol, the get is done from
                 * the general `st-symbol` feature because the actual symbol can
                 * be a type-element symbol that is actually an imported root in a mixin
                 */
                const origin = STSymbol.get(originMeta, topNestClassName || originMeta.root) as
                    | ClassSymbol
                    | ElementSymbol; // ToDo: handle other cases
                context.setCurrentAnchor({
                    name: origin.name,
                    type: origin._kind,
                    resolved: resolvedSymbols[origin._kind][origin.name],
                });
                context.setNodeResolve(node, resolvedSymbols[origin._kind][origin.name]);
            }
        }
    }
    private handleCustomSelector(
        customSelector: string,
        meta: StylableMeta,
        context: ScopeContext,
        name: string,
        node: SelectorNode,
        isFirstInSelector: boolean
    ) {
        const selectorList = parseSelectorWithCache(customSelector, { clone: true });
        const hasSingleSelector = selectorList.length === 1;
        const internalContext = new ScopeContext(
            meta,
            this.resolver,
            removeFirstRootInFirstCompound(selectorList, meta),
            context.rule,
            this.scopeSelectorAst.bind(this)
        );
        const customAstSelectors = this.scopeSelectorAst(internalContext);
        if (!isFirstInSelector) {
            customAstSelectors.forEach(setSingleSpaceOnSelectorLeft);
        }
        if (hasSingleSelector && internalContext.currentAnchor) {
            context.setCurrentAnchor({
                name,
                type: 'pseudo-element',
                resolved: internalContext.currentAnchor.resolved,
            });
            context.setNodeResolve(node, internalContext.currentAnchor.resolved);
        } else {
            // unknown context due to multiple selectors
            context.setCurrentAnchor({
                name,
                type: 'pseudo-element',
                resolved: anyElementAnchor(meta).resolved,
            });
            context.setNodeResolve(node, anyElementAnchor(meta).resolved);
        }
        if (context.transform) {
            Object.assign(node, customAstSelectors[0]);
        }
        // first one handled inline above
        for (let i = 1; i < customAstSelectors.length; i++) {
            const selectorNode = context.selectorAst[context.selectorIndex];
            const nodeIndex = selectorNode.nodes.indexOf(node);
            context.additionalSelectors.push(
                lazyCreateSelector(customAstSelectors[i], selectorNode, nodeIndex)
            );
        }
    }
}

function validateScopes(transformer: StylableTransformer, meta: StylableMeta) {
    const transformedScopes: Record<string, SelectorList> = {};
    for (const scope of meta.scopes) {
        const len = transformer.diagnostics.reports.length;
        const rule = postcss.rule({ selector: scope.params });

        const context = new ScopeContext(
            meta,
            transformer.resolver,
            parseSelectorWithCache(rule.selector, { clone: true }),
            rule,
            transformer.scopeSelectorAst.bind(transformer)
        );
        transformedScopes[rule.selector] = groupCompoundSelectors(
            transformer.scopeSelectorAst(context)
        );
        const ruleReports = transformer.diagnostics.reports.splice(len);

        for (const { code, message, severity, word } of ruleReports) {
            transformer.diagnostics.report(
                {
                    code,
                    message,
                    severity,
                },
                {
                    node: scope,
                    word: word || scope.params,
                }
            );
        }
    }

    return transformedScopes;
}

function removeFirstRootInFirstCompound(selectorList: SelectorList, meta: StylableMeta) {
    const compounded = groupCompoundSelectors(selectorList);
    for (const selector of compounded) {
        const first = selector.nodes.find(({ type }) => type === `compound_selector`);
        if (first && first.type === `compound_selector`) {
            first.nodes = first.nodes.filter((node) => {
                return !(node.type === 'class' && node.value === meta.root);
            });
        }
    }
    return splitCompoundSelectors(compounded);
}

function setSingleSpaceOnSelectorLeft(n: Selector) {
    n.before = ` `;
    let parent: Selector = n;
    let nextLeft: SelectorNode | undefined = n.nodes[0];
    while (nextLeft) {
        if (`before` in nextLeft) {
            nextLeft.before = ``;
        }
        if (nextLeft.type === `selector`) {
            nextLeft = nextLeft.nodes[0];
            parent = nextLeft as Selector;
        } else if (nextLeft.type === `combinator` && nextLeft.combinator === `space`) {
            parent.nodes.shift();
            nextLeft = parent.nodes[0];
        } else {
            return;
        }
    }
}

function anyElementAnchor(meta: StylableMeta): {
    type: 'class' | 'element';
    name: string;
    resolved: Array<CSSResolve<ElementSymbol>>;
} {
    return {
        type: 'element',
        name: '*',
        resolved: [{ _kind: 'css', meta, symbol: { _kind: 'element', name: '*' } }],
    };
}

function lazyCreateSelector(
    customElementChunk: Selector,
    selectorNode: Selector,
    nodeIndex: number
): () => Selector {
    if (nodeIndex === -1) {
        throw new Error('not supported inside nested classes');
    }
    return (): Selector => {
        const clone = cloneDeep(selectorNode);
        (clone.nodes[nodeIndex] as any).nodes = customElementChunk.nodes;
        return clone;
    };
}

interface ScopeAnchor {
    type: 'class' | 'element' | 'pseudo-element';
    name: string;
    resolved: Array<CSSResolve<ClassSymbol | ElementSymbol>>;
}

export class ScopeContext {
    public transform = true;
    public additionalSelectors: Array<() => Selector> = [];
    public selectorIndex = -1;
    public elements: any[] = [];
    public selectorAstResolveMap = new Map<ImmutableSelectorNode, CSSResolve[]>();
    public selector?: Selector;
    public compoundSelector?: CompoundSelector;
    public node?: CompoundSelector['nodes'][number];
    public currentAnchor?: ScopeAnchor;
    public nestingSelectorAnchor?: ScopeAnchor;
    constructor(
        public originMeta: StylableMeta,
        public resolver: StylableResolver,
        public selectorAst: SelectorList,
        public rule: postcss.Rule,
        public scopeSelectorAst: StylableTransformer['scopeSelectorAst'],
        public topNestClassName: string = ``
    ) {}
    public initRootAnchor(anchor: ScopeAnchor) {
        this.currentAnchor = anchor;
    }
    public setNodeResolve(node: SelectorNode, resolve: CSSResolve[]) {
        this.selectorAstResolveMap.set(node, resolve);
    }
    public setCurrentAnchor(anchor: ScopeAnchor) {
        if (this.selectorIndex !== undefined && this.selectorIndex !== -1) {
            this.elements[this.selectorIndex].push(anchor);
        }
        this.currentAnchor = anchor;
    }
    public insertDescendantCombinatorBeforePseudoElement() {
        if (
            this.selector &&
            this.compoundSelector &&
            this.node &&
            this.node.type === `pseudo_element`
        ) {
            if (this.compoundSelector.nodes[0] === this.node) {
                const compoundIndex = this.selector.nodes.indexOf(this.compoundSelector);
                this.selector.nodes.splice(compoundIndex, 0, {
                    type: `combinator`,
                    combinator: `space`,
                    value: ` `,
                    before: ``,
                    after: ``,
                    start: this.node.start,
                    end: this.node.start,
                    invalid: false,
                });
            }
        }
    }
    public createNestedContext(selectorAst: SelectorList) {
        const ctx = new ScopeContext(
            this.originMeta,
            this.resolver,
            selectorAst,
            this.rule,
            this.scopeSelectorAst,
            this.topNestClassName
        );
        Object.assign(ctx, this);
        ctx.selectorAst = selectorAst;

        ctx.selectorIndex = -1;
        ctx.elements = [];
        ctx.additionalSelectors = [];

        return ctx;
    }
    public isDuplicateStScopeDiagnostic() {
        // ToDo: should be removed once st-scope transformation moves to the end of the transform process
        const transformedScope =
            this.originMeta.transformedScopes?.[getRuleScopeSelector(this.rule) || ``];
        if (transformedScope && this.selector && this.compoundSelector) {
            const currentCompoundSelector = stringifySelector(this.compoundSelector);
            const i = this.selector.nodes.indexOf(this.compoundSelector);
            for (const stScopeSelectorCompounded of transformedScope) {
                // if we are in a chunk index that is in the rage of the @st-scope param
                if (i <= stScopeSelectorCompounded.nodes.length) {
                    for (const scopeNode of stScopeSelectorCompounded.nodes) {
                        const scopeNodeSelector = stringifySelector(scopeNode);
                        // if the two chunks match the error is already reported by the @st-scope validation
                        if (scopeNodeSelector === currentCompoundSelector) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
}

/**
 * in the process of moving transformations that shouldn't be in the analyzer.
 * all changes were moved here to be called at the beginning of the transformer,
 * and should be inlined in the process in the future.
 */
function prepareAST(context: FeatureTransformContext, ast: postcss.Root) {
    // ToDo: inline transformations
    const toRemove: Array<postcss.Node | (() => void)> = [];
    ast.walk((node) => {
        const input = { context, node, toRemove };
        STNamespace.hooks.prepareAST(input);
        STImport.hooks.prepareAST(input);
        STScope.hooks.prepareAST(input);
        STVar.hooks.prepareAST(input);
        STCustomSelector.hooks.prepareAST(input);
        CSSCustomProperty.hooks.prepareAST(input);
    });
    for (const removeOrNode of toRemove) {
        typeof removeOrNode === 'function' ? removeOrNode() : removeOrNode.remove();
    }
}
