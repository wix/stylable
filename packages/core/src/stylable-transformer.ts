import isVendorPrefixed from 'is-vendor-prefixed';
import * as postcss from 'postcss';
import type { FileProcessor } from './cached-process-file';
import { createDiagnosticReporter, Diagnostics } from './diagnostics';
import { StylableEvaluator } from './functions';
import { nativePseudoElements } from './native-reserved-lists';
import {
    cloneSelector,
    createCombinatorSelector,
    parseSelectorWithCache,
    stringifySelector,
} from './helpers/selector';
import { isEqual } from './helpers/eql';
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
    STStructure,
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
import type { StylableMeta } from './stylable-meta';
import {
    CSSResolve,
    StylableResolverCache,
    StylableResolver,
    createSymbolResolverWithCache,
} from './stylable-resolver';
import { validateCustomPropertyName } from './helpers/css-custom-property';
import type { ModuleResolver } from './types';
import { getRuleScopeSelector } from './deprecated/postcss-ast-extension';
import type { MappedStates } from './helpers/custom-state';

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
    experimentalSelectorInference?: boolean;
}

export const transformerDiagnostics = {
    UNKNOWN_PSEUDO_ELEMENT: createDiagnosticReporter(
        '12001',
        'error',
        (name: string) => `unknown pseudo element "${name}"`
    ),
};

type PostcssContainer = postcss.Container<postcss.ChildNode> | postcss.Document;

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
    public getResolvedSymbols: ReturnType<typeof createSymbolResolverWithCache>;
    private directiveNodes: postcss.Declaration[] = [];
    public experimentalSelectorInference: boolean;
    public containerInferredSelectorMap = new Map<PostcssContainer, InferredSelector>();
    constructor(options: TransformerOptions) {
        this.diagnostics = options.diagnostics;
        this.keepValues = options.keepValues || false;
        this.fileProcessor = options.fileProcessor;
        this.replaceValueHook = options.replaceValueHook;
        this.postProcessor = options.postProcessor;
        this.experimentalSelectorInference = options.experimentalSelectorInference === true;
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
        meta.exports = {
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
        STVar.hooks.transformInit({ context });
        if (!this.experimentalSelectorInference) {
            meta.transformedScopes = validateScopes(this, meta);
        }
        this.transformAst(meta.targetAst, meta, meta.exports);
        meta.transformDiagnostics = this.diagnostics;
        const result = { meta, exports: meta.exports };

        return this.postProcessor ? this.postProcessor(result, this) : result;
    }
    public transformAst(
        ast: postcss.Root,
        meta: StylableMeta,
        metaExports?: StylableExports,
        stVarOverride: Record<string, string> = this.defaultStVarOverride,
        path: string[] = [],
        mixinTransform = false,
        inferredSelectorMixin?: InferredSelector
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
            inferredSelectorMixin,
        };
        const transformResolveOptions = {
            context: transformContext,
        };
        prepareAST(transformContext, ast, this.experimentalSelectorInference);

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
                    transformer: this,
                });
            } else if (name === 'property') {
                CSSCustomProperty.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: cssVarsMapping,
                    transformer: this,
                });
            } else if (name === 'keyframes') {
                CSSKeyframes.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: keyframesResolve,
                    transformer: this,
                });
            } else if (name === 'layer') {
                CSSLayer.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: layerResolve,
                    transformer: this,
                });
            } else if (name === 'import') {
                CSSLayer.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: layerResolve,
                    transformer: this,
                });
            } else if (name === 'container') {
                CSSContains.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: containsResolve,
                    transformer: this,
                });
            } else if (name === 'st-scope') {
                STScope.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: containsResolve,
                    transformer: this,
                });
            } else if (name === 'custom-selector') {
                STCustomSelector.hooks.transformAtRuleNode({
                    context: transformContext,
                    atRule,
                    resolved: containsResolve,
                    transformer: this,
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

            if (decl.prop.startsWith('-st-')) {
                if (this.mode === 'production') {
                    this.directiveNodes.push(decl);
                }
                return;
            }

            decl.value = this.evaluator.evaluateValue(transformContext, {
                value: decl.value,
                meta,
                node: decl,
                cssVarsMapping,
            }).outputValue;
        };

        ast.walk((node) => {
            if (node.type === 'rule') {
                if (isChildOfAtRule(node, 'keyframes')) {
                    return;
                }
                // get context inferred selector
                let currentParent: PostcssContainer | undefined = node.parent;
                while (currentParent && !this.containerInferredSelectorMap.has(currentParent)) {
                    currentParent = currentParent.parent;
                }
                // transform selector
                const { selector, inferredSelector } = this.scopeSelector(
                    meta,
                    node.selector,
                    node,
                    currentParent && this.containerInferredSelectorMap.get(currentParent),
                    inferredSelectorMixin
                );
                // save results
                this.containerInferredSelectorMap.set(node, inferredSelector);
                node.selector = selector;
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
        if (this.experimentalSelectorInference) {
            STScope.hooks.transformLastPass(lastPassParams);
        }
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
    public scopeSelector(
        originMeta: StylableMeta,
        selector: string,
        selectorNode?: postcss.Rule | postcss.AtRule,
        inferredNestSelector?: InferredSelector,
        inferredMixinSelector?: InferredSelector,
        unwrapGlobals = false
    ): {
        selector: string;
        elements: ResolvedElement[][];
        targetSelectorAst: SelectorList;
        inferredSelector: InferredSelector;
    } {
        const context = this.createSelectorContext(
            originMeta,
            parseSelectorWithCache(selector, { clone: true }),
            selectorNode || postcss.rule({ selector }),
            selector,
            inferredNestSelector,
            inferredMixinSelector
        );
        const targetSelectorAst = this.scopeSelectorAst(context);
        if (unwrapGlobals) {
            STGlobal.unwrapPseudoGlobals(targetSelectorAst);
        }
        return {
            targetSelectorAst,
            selector: stringifySelector(targetSelectorAst),
            elements: context.elements,
            inferredSelector: context.inferredMultipleSelectors,
        };
    }
    public createSelectorContext(
        meta: StylableMeta,
        selectorAst: SelectorList,
        selectorNode: postcss.Rule | postcss.AtRule,
        selectorStr?: string,
        selectorNest?: InferredSelector,
        selectorMixin?: InferredSelector
    ) {
        return new ScopeContext(
            meta,
            this.resolver,
            selectorAst,
            selectorNode,
            this.scopeSelectorAst.bind(this),
            this,
            selectorNest,
            selectorMixin,
            undefined,
            selectorStr
        );
    }
    public createInferredSelector(
        meta: StylableMeta,
        { name, type }: { name: string; type: 'class' | 'element' }
    ) {
        const resolvedSymbols = this.getResolvedSymbols(meta);
        const resolved = resolvedSymbols[type][name];
        return new InferredSelector(this, resolved);
    }
    public scopeSelectorAst(context: ScopeContext): SelectorList {
        // group compound selectors: .a.b .c:hover, a .c:hover -> [[[.a.b], [.c:hover]], [[.a], [.c:hover]]]
        const selectorList = groupCompoundSelectors(context.selectorAst);
        // loop over selectors
        for (const selector of selectorList) {
            context.elements.push([]);
            context.selectorIndex++;
            context.selector = selector;
            // loop over nodes
            for (const node of [...selector.nodes]) {
                if (node.type !== `compound_selector`) {
                    if (node.type === 'combinator') {
                        if (this.experimentalSelectorInference || context.isNested) {
                            context.setNextSelectorScope(context.inferredSelectorContext, node);
                        }
                    }
                    continue;
                }
                context.compoundSelector = node;
                // loop over each node in a compound selector
                for (const compoundNode of node.nodes) {
                    if (compoundNode.type === 'universal' && this.experimentalSelectorInference) {
                        context.setNextSelectorScope(
                            [
                                {
                                    _kind: 'css',
                                    meta: context.originMeta,
                                    symbol: CSSType.createSymbol({ name: '*' }),
                                },
                            ],
                            node
                        );
                    }
                    context.node = compoundNode;
                    // transform node
                    this.handleCompoundNode(context as Required<ScopeContext>);
                }
            }
            // add inferred selector end to multiple selector
            context.inferredMultipleSelectors.add(context.inferredSelector);
            if (selectorList.length - 1 > context.selectorIndex) {
                // reset current anchor for all except last selector
                context.inferredSelector = new InferredSelector(
                    this,
                    context.inferredSelectorStart
                );
            }
        }
        // backwards compatibility for elements - empty selector still have an empty first target
        if (selectorList.length === 0) {
            context.elements.push([]);
        }
        const targetAst = splitCompoundSelectors(selectorList);
        context.splitSelectors.duplicateSelectors(targetAst);
        for (let i = 0; i < targetAst.length; i++) {
            context.selectorAst[i] = targetAst[i];
        }
        return targetAst;
    }
    private handleCompoundNode(context: Required<ScopeContext>) {
        const { inferredSelector, node, originMeta } = context;
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
            const inferredElement = inferredSelector.getPseudoElements({
                isFirstInSelector: context.isFirstInSelector(node),
                name: node.value,
                experimentalSelectorInference: this.experimentalSelectorInference,
            })[node.value];
            if (inferredElement) {
                context.setNextSelectorScope(inferredElement.inferred, node, node.value);
                if (context.transform) {
                    context.transformIntoMultiSelector(node, inferredElement.selectors);
                }
            } else {
                // first definition of a part in the extends/alias chain
                context.setNextSelectorScope([], node, node.value);

                if (
                    !nativePseudoElements.includes(node.value) &&
                    !isVendorPrefixed(node.value) &&
                    !context.isDuplicateStScopeDiagnostic()
                ) {
                    this.diagnostics.report(
                        transformerDiagnostics.UNKNOWN_PSEUDO_ELEMENT(node.value),
                        {
                            node: context.ruleOrAtRule,
                            word: node.value,
                        }
                    );
                }
            }
        } else if (node.type === 'pseudo_class') {
            const isCustomSelector = STCustomSelector.hooks.transformSelectorNode({
                context: transformerContext,
                selectorContext: context,
                node,
            });
            if (!isCustomSelector) {
                CSSPseudoClass.hooks.transformSelectorNode({
                    context: transformerContext,
                    selectorContext: context,
                    node,
                });
            }
        } else if (node.type === `nesting`) {
            context.setNextSelectorScope(context.inferredSelectorNest, node, node.value);
        } else if (node.type === 'attribute') {
            STMixin.hooks.transformSelectorNode({
                context: transformerContext,
                selectorContext: context,
                node,
            });
        }
    }
}

function validateScopes(transformer: StylableTransformer, meta: StylableMeta) {
    const transformedScopes: Record<string, SelectorList> = {};
    for (const scope of meta.scopes) {
        const len = transformer.diagnostics.reports.length;
        const rule = postcss.rule({ selector: scope.params });

        const context = transformer.createSelectorContext(
            meta,
            parseSelectorWithCache(rule.selector, { clone: true }),
            rule,
            rule.selector
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

function removeInitialCompoundMarker(
    selector: Selector,
    meta: StylableMeta,
    structureMode: boolean
) {
    let hadCompoundStart = false;
    const compoundedSelector = groupCompoundSelectors(selector);
    const first = compoundedSelector.nodes.find(
        ({ type }) => type === `compound_selector`
    ) as CompoundSelector;
    if (first) {
        const matchNode = structureMode
            ? (node: SelectorNode) => node.type === 'nesting'
            : (node: SelectorNode) => node.type === 'class' && node.value === meta.root;
        for (let i = 0; i < first.nodes.length; i++) {
            const node = first.nodes[i];
            if (node.type === 'comment') {
                continue;
            }
            if (matchNode(node)) {
                hadCompoundStart = true;
                first.nodes.splice(i, 1);
            }
            break;
        }
    }
    return { selector: splitCompoundSelectors(compoundedSelector), hadCompoundStart };
}

type SelectorSymbol = ClassSymbol | ElementSymbol | STStructure.PartSymbol;
type InferredResolve = CSSResolve<SelectorSymbol>;
type InferredPseudoElement = {
    inferred: InferredSelector;
    selectors: SelectorList;
};
type InferredPseudoClass = {
    meta: StylableMeta;
    state: MappedStates[string];
};
export class InferredSelector {
    protected resolveSet = new Set<InferredResolve[]>();
    constructor(
        private api: Pick<
            StylableTransformer,
            | 'getResolvedSymbols'
            | 'createSelectorContext'
            | 'scopeSelectorAst'
            | 'createInferredSelector'
        >,
        resolve?: InferredResolve[] | InferredSelector
    ) {
        if (resolve) {
            this.add(resolve);
        }
    }
    public isEmpty() {
        return this.resolveSet.size === 0;
    }
    public set(resolve: InferredResolve[] | InferredSelector) {
        if (resolve === this) {
            return;
        }
        this.resolveSet.clear();
        this.add(resolve);
    }
    public clone() {
        return new InferredSelector(this.api, this);
    }
    /**
     * Adds to the set of inferred resolved CSS
     * Assumes passes CSSResolved from the same meta/symbol are
     * the same from the same cached transform process to dedupe them.
     */
    public add(resolve: InferredResolve[] | InferredSelector) {
        if (resolve instanceof InferredSelector) {
            resolve.resolveSet.forEach((resolve) => this.add(resolve));
        } else {
            this.resolveSet.add(resolve);
        }
    }
    /**
     * Takes a CSS part resolve and use it extend the current set of inferred resolved.
     * Used to expand the resolved mapped selector with the part definition
     * e.g. part can add nested states/parts that override the inferred mapped selector.
     */
    private addPartOverride(partResolve: CSSResolve<STStructure.PartSymbol>) {
        const newSet = new Set<InferredResolve[]>();
        for (const resolve of this.resolveSet) {
            newSet.add([partResolve, ...resolve]);
        }
        if (!this.resolveSet.size) {
            newSet.add([partResolve]);
        }
        this.resolveSet = newSet;
    }
    public getPseudoClasses({ name: searchedName }: { name?: string } = {}) {
        const collectedStates: Record<string, InferredPseudoClass> = {};
        const resolvedCount: Record<string, number> = {};
        const expectedIntersectionCount = this.resolveSet.size; // ToDo: dec for any types
        const addInferredState = (
            name: string,
            meta: StylableMeta,
            state: MappedStates[string]
        ) => {
            const existing = collectedStates[name];
            if (!existing) {
                collectedStates[name] = { meta, state };
                resolvedCount[name] = 1;
            } else {
                const isStatesEql = isEqual(existing.state, state);
                if (
                    isStatesEql &&
                    // states from same meta
                    (existing.meta === meta ||
                        // global states
                        typeof state === 'string' ||
                        state?.type === 'template')
                ) {
                    resolvedCount[name]++;
                }
            }
        };
        // infer states from  multiple resolved selectors
        for (const resolvedContext of this.resolveSet.values()) {
            const resolvedFoundNames = new Set<string>();
            resolved: for (const { symbol, meta } of resolvedContext) {
                const states = symbol[`-st-states`];
                if (!states) {
                    continue;
                }
                if (searchedName) {
                    if (Object.hasOwnProperty.call(states, searchedName)) {
                        // track state
                        addInferredState(searchedName, meta, states[searchedName]);
                        break resolved;
                    }
                } else {
                    // get all states
                    for (const [name, state] of Object.entries(states)) {
                        if (!resolvedFoundNames.has(name)) {
                            // track state
                            resolvedFoundNames.add(name);
                            addInferredState(name, meta, state);
                        }
                    }
                }
            }
        }
        // strict: remove states that do not exist on ALL resolved selectors
        return expectedIntersectionCount > 1
            ? Object.entries(collectedStates).reduce((resultStates, [name, InferredState]) => {
                  if (resolvedCount[name] >= expectedIntersectionCount) {
                      resultStates[name] = InferredState;
                  }
                  return resultStates;
              }, {} as typeof collectedStates)
            : collectedStates;
    }
    public getPseudoElements({
        isFirstInSelector,
        experimentalSelectorInference,
        name,
    }: {
        isFirstInSelector: boolean;
        experimentalSelectorInference: boolean;
        name?: string;
    }) {
        const collectedElements: Record<string, InferredPseudoElement> = {};
        const resolvedCount: Record<string, number> = {};
        const checked: Record<string, Map<string, boolean>> = {};
        const expectedIntersectionCount = this.resolveSet.size; // ToDo: dec for any types
        const addInferredElement = (
            name: string,
            inferred: InferredSelector,
            selectors: SelectorList
        ) => {
            const item = (collectedElements[name] ||= {
                inferred: new InferredSelector(this.api),
                selectors: [],
            });
            // check inferred matching
            if (!item.inferred.matchedElement(inferred)) {
                // ToDo: bailout fast
                return;
            }
            // add match
            resolvedCount[name]++;
            item.inferred.add(inferred);
            item.selectors.push(...selectors);
        };
        // infer elements from  multiple resolved selectors
        for (const resolvedContext of this.resolveSet.values()) {
            /**
             * search for elements in each resolved selector.
             * start at 1 for legacy flat mode to prefer inherited elements over local
             */
            const startIndex =
                resolvedContext.length === 1 ||
                (resolvedContext[0] &&
                    (STStructure.isStructureMode(resolvedContext[0].meta) ||
                        resolvedContext[0].symbol._kind === 'part'))
                    ? 0
                    : 1;
            resolved: for (let i = startIndex; i < resolvedContext.length; i++) {
                const { symbol, meta } = resolvedContext[i];
                const structureMode = STStructure.isStructureMode(meta);
                if (
                    symbol._kind !== 'part' &&
                    (symbol.alias || (!structureMode && !symbol['-st-root']))
                ) {
                    // non-root & alias classes don't have parts: bailout
                    continue;
                }
                if (name) {
                    const cacheContext = symbol._kind === 'part' ? symbol.id : symbol.name;
                    const uniqueId = meta.source + '::' + cacheContext;
                    resolvedCount[name] ??= 0;
                    checked[name] ||= new Map();
                    if (checked[name].has(uniqueId)) {
                        if (checked[name].get(uniqueId)) {
                            resolvedCount[name]++;
                        }
                        continue;
                    }
                    // get part symbol
                    const partDef = STStructure.getPart(symbol, name);
                    // save to cache
                    checked[name].set(uniqueId, !!partDef);

                    if (!partDef) {
                        continue;
                    }
                    if (Array.isArray(partDef.mapTo)) {
                        // prefer custom selector
                        const selectorList = cloneSelector(partDef.mapTo);
                        const selectorStr = stringifySelector(partDef.mapTo);
                        selectorList.forEach((selector) => {
                            const r = removeInitialCompoundMarker(selector, meta, structureMode);
                            selector.nodes = r.selector.nodes;
                            selector.before = '';
                            if (!r.hadCompoundStart && !isFirstInSelector) {
                                selector.nodes.unshift(
                                    createCombinatorSelector({ combinator: 'space' })
                                );
                            }
                        });
                        const internalContext = this.api.createSelectorContext(
                            meta,
                            selectorList,
                            postcss.rule({ selector: selectorStr }),
                            selectorStr
                        );
                        internalContext.isStandaloneSelector = isFirstInSelector;
                        if (!structureMode && experimentalSelectorInference) {
                            internalContext.inferredSelectorStart.set(
                                this.api.createInferredSelector(meta, {
                                    name: 'root',
                                    type: 'class',
                                })
                            );
                            internalContext.inferredSelector.set(
                                internalContext.inferredSelectorStart
                            );
                        }
                        const customAstSelectors = this.api.scopeSelectorAst(internalContext);
                        const inferred =
                            customAstSelectors.length === 1 || experimentalSelectorInference
                                ? internalContext.inferredMultipleSelectors
                                : new InferredSelector(this.api, [
                                      {
                                          _kind: 'css',
                                          meta,
                                          symbol: CSSType.createSymbol({ name: '*' }),
                                      },
                                  ]);
                        // add part resolve to inferred resolve set
                        if (structureMode) {
                            inferred.addPartOverride({ _kind: 'css', meta, symbol: partDef });
                        }
                        addInferredElement(name, inferred, customAstSelectors);
                        break resolved;
                    } else {
                        // matching class part
                        const resolvedPart = this.api.getResolvedSymbols(meta).class[name];
                        const resolvedBaseSymbol = getOriginDefinition(resolvedPart);
                        const nodes: SelectorNode[] = [];
                        // insert descendant combinator before internal custom element
                        if (!resolvedBaseSymbol.symbol[`-st-root`] && !isFirstInSelector) {
                            nodes.push(createCombinatorSelector({ combinator: 'space' }));
                        }
                        // create part class
                        const classNode = {} as SelectorNode;
                        CSSClass.namespaceClass(
                            resolvedBaseSymbol.meta,
                            resolvedBaseSymbol.symbol,
                            classNode
                        );
                        nodes.push(classNode);

                        addInferredElement(name, new InferredSelector(this.api, resolvedPart), [
                            { type: 'selector', after: '', before: '', end: 0, start: 0, nodes },
                        ]);
                        break resolved;
                    }
                } else {
                    // ToDo: implement get all elements
                }
            }
        }
        // strict: remove elements that do not exist on ALL resolved selectors
        return expectedIntersectionCount > 1
            ? Object.entries(collectedElements).reduce(
                  (resultElements, [name, InferredElement]) => {
                      if (resolvedCount[name] >= expectedIntersectionCount) {
                          resultElements[name] = InferredElement;
                      }
                      return resultElements;
                  },
                  {} as typeof collectedElements
              )
            : collectedElements;
    }
    private matchedElement(inferred: InferredSelector): boolean {
        for (const target of this.resolveSet) {
            const targetBaseElementSymbol = getOriginDefinition(target);
            for (const tested of inferred.resolveSet) {
                const testedBaseElementSymbol = getOriginDefinition(tested);
                if (targetBaseElementSymbol !== testedBaseElementSymbol) {
                    return false;
                }
            }
        }
        return true;
    }
    // function to temporarily handle single resolved selector type while refactoring
    //      ToDo: remove temporarily single resolve
    getSingleResolve(): InferredResolve[] {
        if (this.resolveSet.size !== 1) {
            return [];
        }
        return this.resolveSet.values().next().value;
    }
}

class SelectorMultiplier {
    private dupIndicesPerSelector: [nodeIndex: number, selectors: SelectorList][][] = [];
    public addSplitPoint(selectorIndex: number, nodeIndex: number, selectors: SelectorList) {
        if (selectors.length) {
            this.dupIndicesPerSelector[selectorIndex] ||= [];
            this.dupIndicesPerSelector[selectorIndex].push([nodeIndex, selectors]);
        }
    }
    public duplicateSelectors(targetSelectors: SelectorList) {
        // iterate top level selector
        for (const [selectorIndex, insertionPoints] of Object.entries(this.dupIndicesPerSelector)) {
            const duplicationList = [targetSelectors[Number(selectorIndex)]];
            // iterate insertion points
            for (const [nodeIndex, selectors] of insertionPoints) {
                // collect the duplicate selectors to be multiplied by following insertion points
                const added: SelectorList = [];
                // iterate selectors for insertion point
                for (const replaceSelector of selectors) {
                    // duplicate selectors and replace selector at insertion point
                    for (const originSelector of duplicationList) {
                        const dupSelector = { ...originSelector, nodes: [...originSelector.nodes] };
                        dupSelector.nodes[nodeIndex] = replaceSelector;
                        added.push(dupSelector);
                    }
                }
                // add the duplicated selectors from insertion point to
                // the list of selector to be duplicated for following insertion
                // points and to the target selector list
                for (const addedSelector of added) {
                    duplicationList.push(addedSelector);
                    targetSelectors.push(addedSelector);
                }
            }
        }
    }
}

export class ScopeContext {
    public transform = true;
    // source multi-selector input
    public selectorStr = '';
    public selectorIndex = -1;
    public elements: any[] = [];
    public selectorAstResolveMap = new Map<ImmutableSelectorNode, InferredSelector>();
    public selector?: Selector;
    public compoundSelector?: CompoundSelector;
    public node?: CompoundSelector['nodes'][number];
    // true for nested selector
    public isNested: boolean;
    // store selector duplication points
    public splitSelectors = new SelectorMultiplier();
    public lastInferredSelectorNode: SelectorNode | undefined;
    // selector is not a continuation of another selector
    public isStandaloneSelector = true;
    // used as initial selector
    public inferredSelectorStart: InferredSelector;
    // used as initial selector or after combinators
    public inferredSelectorContext: InferredSelector;
    // used for nesting selector
    public inferredSelectorNest: InferredSelector;
    // current type while traversing a selector
    public inferredSelector: InferredSelector;
    // combined type of the multiple selectors
    public inferredMultipleSelectors: InferredSelector = new InferredSelector(this.transformer);
    constructor(
        public originMeta: StylableMeta,
        public resolver: StylableResolver,
        public selectorAst: SelectorList,
        public ruleOrAtRule: postcss.Rule | postcss.AtRule,
        public scopeSelectorAst: StylableTransformer['scopeSelectorAst'],
        private transformer: StylableTransformer,
        inferredSelectorNest?: InferredSelector,
        public inferredSelectorMixin?: InferredSelector,
        inferredSelectorContext?: InferredSelector,
        selectorStr?: string
    ) {
        this.isNested = !!(
            ruleOrAtRule.parent &&
            // top level
            ruleOrAtRule.parent.type !== 'root' &&
            // directly in @st-scope
            !STScope.isStScopeStatement(ruleOrAtRule.parent)
        );
        /* 
            resolve default selector context for initial selector and selector
            following a combinator.
            
            Currently set to stylesheet root for top level selectors and selectors
            directly nested under @st-scope. But will change in the future to a universal selector
            once experimentalSelectorInference will be the default behavior
        */
        const inferredContext =
            inferredSelectorContext ||
            (this.isNested || transformer.experimentalSelectorInference
                ? new InferredSelector(transformer, [
                      {
                          _kind: 'css',
                          meta: originMeta,
                          symbol: CSSType.createSymbol({ name: '*' }),
                      },
                  ])
                : transformer.createInferredSelector(originMeta, {
                      name: originMeta.root,
                      type: 'class',
                  }));
        // set selector data
        this.selectorStr = selectorStr || stringifySelector(selectorAst);
        this.inferredSelectorContext = new InferredSelector(this.transformer, inferredContext);
        this.inferredSelectorStart = new InferredSelector(this.transformer, inferredContext);
        this.inferredSelectorNest = inferredSelectorNest || this.inferredSelectorContext.clone();
        this.inferredSelector = new InferredSelector(
            this.transformer,
            this.inferredSelectorContext
        );
    }
    get experimentalSelectorInference() {
        return this.transformer.experimentalSelectorInference;
    }
    static legacyElementsTypesMapping: Record<string, string> = {
        pseudo_element: 'pseudo-element',
        class: 'class',
        type: 'element',
    };
    public setNextSelectorScope(
        resolved: InferredResolve[] | InferredSelector,
        node: SelectorNode,
        name?: string
    ) {
        if (name && this.selectorIndex !== undefined && this.selectorIndex !== -1) {
            this.elements[this.selectorIndex].push({
                type: ScopeContext.legacyElementsTypesMapping[node.type] || 'unknown',
                name,
                resolved: Array.isArray(resolved) ? resolved : resolved.getSingleResolve(),
            });
        }
        this.inferredSelector.set(resolved);
        this.selectorAstResolveMap.set(node, this.inferredSelector.clone());
        this.lastInferredSelectorNode = node;
    }
    public isFirstInSelector(node: SelectorNode) {
        const isFirstNode = this.selectorAst[this.selectorIndex].nodes[0] === node;
        if (isFirstNode && this.selectorIndex === 0 && !this.isStandaloneSelector) {
            // force false incase a this context is a splitted part from another selector
            return false;
        }
        return isFirstNode;
    }
    public createNestedContext(selectorAst: SelectorList, selectorContext?: InferredSelector) {
        const ctx = new ScopeContext(
            this.originMeta,
            this.resolver,
            selectorAst,
            this.ruleOrAtRule,
            this.scopeSelectorAst,
            this.transformer,
            this.inferredSelectorNest,
            this.inferredSelectorMixin,
            selectorContext || this.inferredSelectorContext
        );
        ctx.transform = this.transform;
        ctx.selectorAstResolveMap = this.selectorAstResolveMap;

        return ctx;
    }
    public transformIntoMultiSelector(node: SelectorNode, selectors: SelectorList) {
        // transform into the first selector
        Object.assign(node, selectors[0]);
        // keep track of additional selectors for
        // duplication at the end of the selector transform
        selectors.shift();
        const selectorNode = this.selectorAst[this.selectorIndex];
        const nodeIndex = selectorNode.nodes.indexOf(node);
        this.splitSelectors.addSplitPoint(this.selectorIndex, nodeIndex, selectors);
    }
    public isDuplicateStScopeDiagnostic() {
        if (this.experimentalSelectorInference || this.ruleOrAtRule.type !== 'rule') {
            // this check is not required when experimentalSelectorInference is on
            // as @st-scope is not flatten at the beginning of the transformation
            // and diagnostics on it's selector is only checked once.
            return false;
        }
        // ToDo: should be removed once st-scope transformation moves to the end of the transform process
        const transformedScope =
            this.originMeta.transformedScopes?.[getRuleScopeSelector(this.ruleOrAtRule) || ``];
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
function prepareAST(
    context: FeatureTransformContext,
    ast: postcss.Root,
    experimentalSelectorInference: boolean
) {
    // ToDo: inline transformations
    const toRemove: Array<postcss.Node | (() => void)> = [];
    ast.walk((node) => {
        const input = { context, node, toRemove };
        STNamespace.hooks.prepareAST(input);
        STImport.hooks.prepareAST(input);
        if (!experimentalSelectorInference) {
            STScope.hooks.prepareAST(input);
        }
        STVar.hooks.prepareAST(input);
        if (!experimentalSelectorInference) {
            STCustomSelector.hooks.prepareAST(input);
        }
        CSSCustomProperty.hooks.prepareAST(input);
    });
    for (const removeOrNode of toRemove) {
        typeof removeOrNode === 'function' ? removeOrNode() : removeOrNode.remove();
    }
}
