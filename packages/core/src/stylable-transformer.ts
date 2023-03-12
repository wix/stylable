import isVendorPrefixed from 'is-vendor-prefixed';
import * as postcss from 'postcss';
import type { FileProcessor } from './cached-process-file';
import { createDiagnosticReporter, Diagnostics } from './diagnostics';
import { StylableEvaluator } from './functions';
import { nativePseudoElements } from './native-reserved-lists';
import {
    createCombinatorSelector,
    parseSelectorWithCache,
    stringifySelector,
} from './helpers/selector';
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
    experimentalSelectorResolve?: boolean;
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
    public getResolvedSymbols: ReturnType<typeof createSymbolResolverWithCache>;
    private directiveNodes: postcss.Declaration[] = [];
    private experimentalSelectorResolve: boolean;
    constructor(options: TransformerOptions) {
        this.diagnostics = options.diagnostics;
        this.keepValues = options.keepValues || false;
        this.fileProcessor = options.fileProcessor;
        this.replaceValueHook = options.replaceValueHook;
        this.postProcessor = options.postProcessor;
        this.experimentalSelectorResolve = options.experimentalSelectorResolve === true;
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
        selectorContext?: InferredSelector
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
                node.selector = this.scopeRule(meta, node, selectorContext);
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
        selectorContext?: InferredSelector,
        unwrapGlobals?: boolean
    ): string {
        return this.scopeSelector(meta, rule.selector, rule, selectorContext, unwrapGlobals)
            .selector;
    }
    public scopeSelector(
        originMeta: StylableMeta,
        selector: string,
        rule?: postcss.Rule,
        selectorContext?: InferredSelector,
        unwrapGlobals = false
    ): { selector: string; elements: ResolvedElement[][]; targetSelectorAst: SelectorList } {
        const context = this.createSelectorContext(
            originMeta,
            parseSelectorWithCache(selector, { clone: true }),
            rule || postcss.rule({ selector }),
            selectorContext
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
        selectorContext: InferredSelector = this.createInferredSelector(meta, {
            name: meta.root,
            type: 'class',
        })
    ) {
        return new ScopeContext(
            meta,
            this.resolver,
            selectorAst,
            rule,
            this.scopeSelectorAst.bind(this),
            this,
            selectorContext
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
            // add inferred selector end to multiple selector
            context.inferredMultipleSelectors.add(context.inferredSelector);
            if (selectorList.length - 1 > context.selectorIndex) {
                // reset current anchor for all except last selector
                context.inferredSelector = new InferredSelector(
                    this,
                    context.inferredSelectorContext
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
                experimentalSelectorResolve: this.experimentalSelectorResolve,
            })[node.value];
            if (inferredElement) {
                context.setNextSelectorScope(inferredElement.inferred, node, node.value);
                if (context.transform) {
                    // transform into the first selector
                    Object.assign(node, inferredElement.selectors[0]);
                    // keep track of additional selectors for
                    // duplication at the end of the selector transform
                    inferredElement.selectors.shift();
                    const selectorNode = context.selectorAst[context.selectorIndex];
                    const nodeIndex = selectorNode.nodes.indexOf(node);
                    context.splitSelectors.addSplitPoint(
                        context.selectorIndex,
                        nodeIndex,
                        inferredElement.selectors
                    );
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
            context.setNextSelectorScope(context.inferredSelectorContext, node, node.value);
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
            rule
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

function removeFirstRootInFirstCompound(selector: Selector, meta: StylableMeta) {
    let hadRoot = false;
    const compoundedSelector = groupCompoundSelectors(selector);
    const first = compoundedSelector.nodes.find(
        ({ type }) => type === `compound_selector`
    ) as CompoundSelector;
    if (first) {
        first.nodes = first.nodes.filter((node) => {
            if (node.type === 'class' && node.value === meta.root) {
                hadRoot = true;
                return false;
            }
            return true;
        });
    }
    return { selector: splitCompoundSelectors(compoundedSelector), hadRoot };
}

type SelectorSymbol = ClassSymbol | ElementSymbol;
type InferredResolve = CSSResolve<SelectorSymbol>;
type InferredPseudoElement = {
    inferred: InferredSelector;
    selectors: SelectorList;
};
class InferredSelector {
    protected resolveSet = new Set<InferredResolve[]>();
    constructor(
        private api: Pick<
            StylableTransformer,
            'getResolvedSymbols' | 'createSelectorContext' | 'scopeSelectorAst'
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
    public add(resolve: InferredResolve[] | InferredSelector) {
        if (resolve instanceof InferredSelector) {
            resolve.resolveSet.forEach((resolve) => this.add(resolve));
        } else {
            // ToDo: check uniqueness
            this.resolveSet.add(resolve);
        }
    }
    public getPseudoElements({
        isFirstInSelector,
        experimentalSelectorResolve,
        name,
    }: {
        isFirstInSelector: boolean;
        experimentalSelectorResolve: boolean;
        name?: string;
    }) {
        const resolvedElements: Record<string, InferredPseudoElement> = {};
        const resolvedCount: Record<string, number> = {};
        const checked: Record<string, Set<string>> = {};
        const expectedIntersectionCount = this.resolveSet.size; // ToDo: dec for any types
        const addInferredElement = (
            name: string,
            inferred: InferredSelector,
            selectors: SelectorList
        ) => {
            const item = (resolvedElements[name] ||= {
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
             * start at 1 for extended symbols to prefer inherited elements over local
             */
            const startIndex = resolvedContext.length === 1 ? 0 : 1;
            resolved: for (let i = startIndex; i < resolvedContext.length; i++) {
                const { symbol, meta } = resolvedContext[i];
                if (!symbol['-st-root'] || symbol.alias) {
                    // non-root & alias classes don't have parts: bailout
                    continue;
                }
                if (name) {
                    resolvedCount[name] ??= 0;
                    checked[name] ||= new Set();
                    const uniqueId = meta.source + '::' + name;
                    if (checked[name].has(uniqueId)) {
                        resolvedCount[name]++;
                        continue;
                    }
                    checked[name].add(uniqueId);
                    // prefer custom selector
                    const customSelector = STCustomSelector.getCustomSelectorExpended(meta, name);
                    if (customSelector) {
                        const selectorList = parseSelectorWithCache(customSelector, {
                            clone: true,
                        });
                        selectorList.forEach((selector) => {
                            const r = removeFirstRootInFirstCompound(selector, meta);
                            selector.nodes = r.selector.nodes;
                            selector.before = '';
                            if (!r.hadRoot && !isFirstInSelector) {
                                selector.nodes.unshift(
                                    createCombinatorSelector({ combinator: 'space' })
                                );
                            }
                        });
                        const internalContext = this.api.createSelectorContext(
                            meta,
                            selectorList,
                            postcss.rule({ selector: customSelector })
                        );
                        internalContext.isStandaloneSelector = isFirstInSelector;
                        const customAstSelectors = this.api.scopeSelectorAst(internalContext);
                        const inferred =
                            customAstSelectors.length === 1 || experimentalSelectorResolve
                                ? internalContext.inferredMultipleSelectors
                                : new InferredSelector(this.api, [
                                      {
                                          _kind: 'css',
                                          meta,
                                          symbol: { _kind: 'element', name: '*' },
                                      },
                                  ]);

                        addInferredElement(name, inferred, customAstSelectors);
                        break resolved;
                    }
                    // matching class part
                    const classSymbol = CSSClass.get(meta, name);
                    if (classSymbol) {
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
        if (expectedIntersectionCount > 1) {
            for (const name of Object.keys(resolvedElements)) {
                if (resolvedCount[name] < expectedIntersectionCount) {
                    delete resolvedElements[name];
                }
            }
        }
        return resolvedElements;
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
        for (const [selectorIndex, dupIndices] of Object.entries(this.dupIndicesPerSelector)) {
            const dupOriginList = [targetSelectors[Number(selectorIndex)]];
            for (const [nodeIndex, selectors] of dupIndices) {
                const added: SelectorList = [];
                for (const replaceSelector of selectors) {
                    for (const originSelector of dupOriginList) {
                        const dupSelector = { ...originSelector, nodes: [...originSelector.nodes] };
                        dupSelector.nodes[nodeIndex] = replaceSelector;
                        added.push(dupSelector);
                    }
                }
                dupOriginList.push(...added);
                targetSelectors.push(...added);
            }
        }
    }
}

export class ScopeContext {
    public transform = true;
    public selectorIndex = -1;
    public elements: any[] = [];
    public selectorAstResolveMap = new Map<ImmutableSelectorNode, CSSResolve[]>();
    public selector?: Selector;
    public compoundSelector?: CompoundSelector;
    public node?: CompoundSelector['nodes'][number];
    // store selector duplication points
    public splitSelectors = new SelectorMultiplier();
    // selector is not a continuation of another selector
    public isStandaloneSelector = true;
    // used for nesting or after combinators
    public inferredSelectorContext: InferredSelector;
    // current type while traversing a selector
    public inferredSelector: InferredSelector;
    // combined type of the multiple selectors
    public inferredMultipleSelectors: InferredSelector = new InferredSelector(this.transformer);
    constructor(
        public originMeta: StylableMeta,
        public resolver: StylableResolver,
        public selectorAst: SelectorList,
        public rule: postcss.Rule,
        public scopeSelectorAst: StylableTransformer['scopeSelectorAst'],
        private transformer: StylableTransformer,
        parentSelectorScope: InferredSelector
    ) {
        this.inferredSelectorContext = new InferredSelector(this.transformer, parentSelectorScope);
        this.inferredSelector = new InferredSelector(
            this.transformer,
            this.inferredSelectorContext
        );
    }
    public resetSelectorScope(initialResolve: InferredResolve[]) {
        this.inferredMultipleSelectors = new InferredSelector(this.transformer);
        this.inferredSelector = new InferredSelector(this.transformer, initialResolve);
    }
    public initNewSelector(initialResolve?: InferredResolve[] | InferredSelector) {
        this.inferredMultipleSelectors.add(this.inferredSelector);
        this.inferredSelector = new InferredSelector(this.transformer, initialResolve);
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
        this.selectorAstResolveMap.set(node, this.inferredSelector.getSingleResolve());
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
            this.rule,
            this.scopeSelectorAst,
            this.transformer,
            selectorContext || this.inferredSelectorContext
        );
        ctx.transform = this.transform;
        ctx.selectorAstResolveMap = this.selectorAstResolveMap;

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
