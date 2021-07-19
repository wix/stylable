import { basename } from 'path';
import * as postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import isVendorPrefixed from 'is-vendor-prefixed';
import cloneDeep from 'lodash.clonedeep';

import type { FileProcessor } from './cached-process-file';
import { unbox } from './custom-values';
import type { Diagnostics } from './diagnostics';
import { evalDeclarationValue, processDeclarationValue } from './functions';
import {
    nativePseudoClasses,
    nativePseudoElements,
    reservedKeyFrames,
} from './native-reserved-lists';
import { setStateToNode, stateErrors } from './pseudo-states';
import {
    walkSelector,
    parseSelectorWithCache,
    stringifySelector,
    flattenContainerSelector,
    separateChunks2,
    mergeChunks,
    ChunkedSelector,
    Chunk,
    convertToClass,
} from './helpers/selector';
import { validateRuleStateDefinition } from './helpers/custom-state';
import type { SelectorNode, Selector, SelectorList } from '@tokey/css-selector-parser';
import { createWarningRule, isChildOfAtRule, findRule, getRuleScopeSelector } from './helpers/rule';
import { getOriginDefinition } from './helpers/resolve';
import { appendMixins } from './stylable-mixins';
import type { ClassSymbol, ElementSymbol, StylableMeta } from './stylable-processor';
import type { SRule, SDecl } from './deprecated/postcss-ast-extension';
import { CSSResolve, StylableResolverCache, StylableResolver } from './stylable-resolver';
import { generateScopedCSSVar, isCSSVarProp } from './stylable-utils';
import { valueMapping } from './stylable-value-parsers';
import cssesc from 'cssesc';
import { unescapeCSS } from './helpers/escape';

const { hasOwnProperty } = Object.prototype;

export interface ResolvedElement {
    name: string;
    type: string;
    resolved: Array<CSSResolve<ClassSymbol | ElementSymbol>>;
}

export interface KeyFrameWithNode {
    value: string;
    node: postcss.Node;
}

export interface StylableExports {
    classes: Record<string, string>;
    vars: Record<string, string>;
    stVars: Record<string, string>;
    keyframes: Record<string, string>;
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
    requireModule: (modulePath: string) => any;
    diagnostics: Diagnostics;
    delimiter?: string;
    keepValues?: boolean;
    replaceValueHook?: replaceValueHook;
    postProcessor?: postProcessor;
    mode?: EnvMode;
    resolverCache?: StylableResolverCache;
}

export const transformerWarnings = {
    UNKNOWN_PSEUDO_ELEMENT(name: string) {
        return `unknown pseudo element "${name}"`;
    },
    IMPORT_ISNT_EXTENDABLE() {
        return 'import is not extendable';
    },
    CANNOT_EXTEND_UNKNOWN_SYMBOL(name: string) {
        return `cannot extend unknown symbol "${name}"`;
    },
    CANNOT_EXTEND_JS() {
        return 'JS import is not extendable';
    },
    KEYFRAME_NAME_RESERVED(name: string) {
        return `keyframes "${name}" is reserved`;
    },
    UNKNOWN_IMPORT_ALIAS(name: string) {
        return `cannot use alias for unknown import "${name}"`;
    },
};

export class StylableTransformer {
    public fileProcessor: FileProcessor<StylableMeta>;
    public diagnostics: Diagnostics;
    public resolver: StylableResolver;
    public delimiter: string;
    public keepValues: boolean;
    public replaceValueHook: replaceValueHook | undefined;
    public postProcessor: postProcessor | undefined;
    public mode: EnvMode;
    private metaParts = new WeakMap<StylableMeta, MetaParts>();

    constructor(options: TransformerOptions) {
        this.diagnostics = options.diagnostics;
        this.delimiter = options.delimiter || '__';
        this.keepValues = options.keepValues || false;
        this.fileProcessor = options.fileProcessor;
        this.replaceValueHook = options.replaceValueHook;
        this.postProcessor = options.postProcessor;
        this.resolver = new StylableResolver(
            options.fileProcessor,
            options.requireModule,
            options.resolverCache
        );
        this.mode = options.mode || 'production';
    }
    public transform(meta: StylableMeta): StylableResults {
        const metaExports: StylableExports = {
            classes: {},
            vars: {},
            stVars: {},
            keyframes: {},
        };
        const ast = this.resetTransformProperties(meta);
        this.resolver.validateImports(meta, this.diagnostics);
        meta.transformedScopes = validateScopes(this, meta);
        this.transformAst(ast, meta, metaExports);
        this.transformGlobals(ast, meta);
        meta.transformDiagnostics = this.diagnostics;
        const result = { meta, exports: metaExports };

        return this.postProcessor ? this.postProcessor(result, this) : result;
    }
    public transformAst(
        ast: postcss.Root,
        meta: StylableMeta,
        metaExports?: StylableExports,
        variableOverride?: Record<string, string>,
        path: string[] = [],
        mixinTransform = false
    ) {
        const keyframeMapping = this.scopeKeyframes(ast, meta);
        const cssVarsMapping = this.createCSSVarsMapping(ast, meta);

        ast.walkRules((rule) => {
            if (isChildOfAtRule(rule, 'keyframes')) {
                return;
            }
            rule.selector = this.scopeRule(meta, rule);
        });

        ast.walkAtRules((atRule) => {
            const { name } = atRule;
            if (name === 'media') {
                atRule.params = evalDeclarationValue(
                    this.resolver,
                    atRule.params,
                    meta,
                    atRule,
                    variableOverride,
                    this.replaceValueHook,
                    this.diagnostics,
                    path.slice(),
                    undefined,
                    undefined
                );
            } else if (name === 'property') {
                atRule.params = cssVarsMapping[atRule.params] ?? atRule.params;
            }
        });

        ast.walkDecls((decl) => {
            (decl as SDecl).stylable = { sourceValue: decl.value };

            if (isCSSVarProp(decl.prop)) {
                decl.prop = this.getScopedCSSVar(decl, meta, cssVarsMapping);
            }

            switch (decl.prop) {
                case valueMapping.partialMixin:
                case valueMapping.mixin:
                case valueMapping.states:
                    break;
                default:
                    decl.value = evalDeclarationValue(
                        this.resolver,
                        decl.value,
                        meta,
                        decl,
                        variableOverride,
                        this.replaceValueHook,
                        this.diagnostics,
                        path.slice(),
                        cssVarsMapping,
                        undefined
                    );
            }
        });

        if (!mixinTransform && meta.outputAst && this.mode === 'development') {
            this.addDevRules(meta);
        }
        ast.walkRules((rule) =>
            appendMixins(this, rule as SRule, meta, variableOverride || {}, cssVarsMapping, path)
        );

        if (metaExports) {
            Object.assign(metaExports.classes, this.exportClasses(meta));
            this.exportLocalVars(meta, metaExports.stVars, variableOverride);
            this.exportKeyframes(keyframeMapping, metaExports.keyframes);
            this.exportCSSVars(cssVarsMapping, metaExports.vars);
        }
    }
    public exportLocalVars(
        meta: StylableMeta,
        stVarsExport: Record<string, string>,
        variableOverride?: Record<string, string>
    ) {
        for (const varSymbol of meta.vars) {
            const { outputValue, topLevelType } = processDeclarationValue(
                this.resolver,
                varSymbol.text,
                meta,
                varSymbol.node,
                variableOverride
            );

            stVarsExport[varSymbol.name] = topLevelType ? unbox(topLevelType) : outputValue;
        }
    }
    public exportCSSVars(
        cssVarsMapping: Record<string, string>,
        varsExport: Record<string, string>
    ) {
        for (const varName of Object.keys(cssVarsMapping)) {
            varsExport[varName.slice(2)] = cssVarsMapping[varName];
        }
    }
    public exportKeyframes(
        keyframeMapping: Record<string, string>,
        keyframesExport: Record<string, string>
    ) {
        Object.assign(keyframesExport, keyframeMapping);
    }
    public scopeKeyframes(ast: postcss.Root, meta: StylableMeta) {
        ast.walkAtRules(/keyframes$/, (atRule) => {
            const name = atRule.params;
            if (~reservedKeyFrames.indexOf(name)) {
                this.diagnostics.error(atRule, transformerWarnings.KEYFRAME_NAME_RESERVED(name), {
                    word: name,
                });
            }
            atRule.params = this.scope(name, meta.namespace);
        });

        const keyframesExports: Record<string, string> = {};

        Object.keys(meta.mappedKeyframes).forEach((key) => {
            const res = this.resolver.resolveKeyframes(meta, key);
            if (res) {
                keyframesExports[key] = this.scope(res.symbol.alias, res.meta.namespace);
            }
        });

        ast.walkDecls(/animation$|animation-name$/, (decl: postcss.Declaration) => {
            const parsed = postcssValueParser(decl.value);
            parsed.nodes.forEach((node) => {
                const scoped = keyframesExports[node.value];
                if (scoped) {
                    node.value = scoped;
                }
            });
            decl.value = parsed.toString();
        });

        return keyframesExports;
    }
    public createCSSVarsMapping(_ast: postcss.Root, meta: StylableMeta) {
        const cssVarsMapping: Record<string, string> = {};

        // imported vars
        for (const imported of meta.imports) {
            for (const symbolName of Object.keys(imported.named)) {
                if (isCSSVarProp(symbolName)) {
                    const importedVar = this.resolver.deepResolve(meta.mappedSymbols[symbolName]);

                    if (
                        importedVar &&
                        importedVar._kind === 'css' &&
                        importedVar.symbol &&
                        importedVar.symbol._kind === 'cssVar'
                    ) {
                        cssVarsMapping[symbolName] = importedVar.symbol.global
                            ? importedVar.symbol.name
                            : generateScopedCSSVar(
                                  importedVar.meta.namespace,
                                  importedVar.symbol.name.slice(2)
                              );
                    }
                }
            }
        }

        // locally defined vars
        for (const localVarName of Object.keys(meta.cssVars)) {
            const cssVar = meta.cssVars[localVarName];

            if (!cssVarsMapping[localVarName]) {
                cssVarsMapping[localVarName] = cssVar.global
                    ? localVarName
                    : generateScopedCSSVar(meta.namespace, localVarName.slice(2));
            }
        }

        return cssVarsMapping;
    }
    public getScopedCSSVar(
        decl: postcss.Declaration,
        meta: StylableMeta,
        cssVarsMapping: Record<string, string>
    ) {
        let prop = decl.prop;

        if (meta.cssVars[prop]) {
            prop = cssVarsMapping[prop];
        }

        return prop;
    }
    public addGlobalsToMeta(selectorAst: SelectorNode[], meta?: StylableMeta) {
        if (!meta) {
            return;
        }

        for (const ast of selectorAst) {
            walkSelector(ast, (inner) => {
                if (inner.type === 'class') {
                    meta.globals[inner.value] = true;
                }
            });
        }
    }
    public transformGlobals(ast: postcss.Root, meta: StylableMeta) {
        ast.walkRules((r) => {
            const selectorAst = parseSelectorWithCache(r.selector, { clone: true });
            walkSelector(selectorAst, (node) => {
                if (node.type === 'pseudo_class' && node.value === 'global') {
                    this.addGlobalsToMeta([node], meta);
                    flattenContainerSelector(node);
                    return walkSelector.skipNested;
                }
                return;
            });
            // this.addGlobalsToMeta([selectorAst], meta);

            r.selector = stringifySelector(selectorAst);
        });
    }
    public resolveSelectorElements(meta: StylableMeta, selector: string): ResolvedElement[][] {
        return this.scopeSelector(meta, selector).elements;
    }
    public scopeRule(meta: StylableMeta, rule: postcss.Rule): string {
        return this.scopeSelector(meta, rule.selector, rule).selector;
    }
    public scope(name: string, namespace: string, delimiter: string = this.delimiter) {
        return namespace ? namespace + delimiter + name : name;
    }
    public scopeEscape(name: string, namespace: string, delimiter: string = this.delimiter) {
        return namespace ? cssesc(namespace, { isIdentifier: true }) + delimiter + name : name;
    }
    public exportClasses(meta: StylableMeta) {
        const locals: Record<string, string> = {};
        const metaParts = this.resolveMetaParts(meta);
        for (const [localName, resolved] of Object.entries(metaParts.class)) {
            const exportedClasses = this.getPartExports(resolved);
            locals[localName] = unescapeCSS(exportedClasses.join(' '));
        }
        return locals;
    }
    /* None alias symbol */
    public getPartExports(resolved: Array<CSSResolve<ClassSymbol | ElementSymbol>>) {
        const exportedClasses = [];
        let first = true;
        for (const { meta, symbol } of resolved) {
            if (!first && symbol[valueMapping.root]) {
                break;
            }
            first = false;
            if (symbol.alias && !symbol[valueMapping.extends]) {
                continue;
            }
            exportedClasses.push(this.scope(symbol.name, meta.namespace));
        }
        return exportedClasses;
    }
    public scopeSelector(
        originMeta: StylableMeta,
        selector: string,
        rule?: postcss.Rule
    ): { selector: string; elements: ResolvedElement[][]; targetSelectorAst: SelectorList } {
        const context = new ScopeContext(
            originMeta,
            parseSelectorWithCache(selector, { clone: true }),
            rule || postcss.rule({ selector })
        );
        const targetSelectorAst = this.scopeSelectorAst(context);
        return {
            targetSelectorAst,
            selector: stringifySelector(targetSelectorAst),
            elements: context.elements,
        };
    }
    public scopeSelectorAst(context: ScopeContext): SelectorList {
        const { originMeta, selectorAst } = context;

        // split selectors to chunks: .a.b .c:hover, a .c:hover -> [[[.a.b], [.c:hover]], [[.a], [.c:hover]]]
        const selectorListChunks = separateChunks2(selectorAst);
        // resolve meta classes and elements
        context.metaParts = this.resolveMetaParts(originMeta);
        // set stylesheet root as the global anchor
        if (!context.currentAnchor) {
            context.initRootAnchor({
                name: originMeta.root,
                type: 'class',
                resolved: context.metaParts.class[originMeta.root],
            });
        }
        // loop over selectors
        for (const chunkedSelector of selectorListChunks) {
            context.elements.push([]);
            context.selectorIndex++;
            context.chunkedSelector = chunkedSelector;
            // loop over chunks
            for (const chunk of chunkedSelector.chunks) {
                context.chunk = chunk;
                // loop over each node in a chunk
                for (const node of [...chunk]) {
                    context.node = node;
                    // transform node
                    this.handleChunkNode(context);
                }
            }
            if (selectorListChunks.length - 1 > context.selectorIndex) {
                context.initRootAnchor({
                    name: originMeta.root,
                    type: 'class',
                    resolved: context.metaParts.class[originMeta.root],
                });
            }
        }
        // backwards compatibility for elements - empty selector still have an empty first target
        if (selectorListChunks.length === 0) {
            context.elements.push([]);
        }
        const outputAst = mergeChunks(selectorListChunks);
        context.additionalSelectors.forEach((addSelector) => outputAst.push(addSelector()));
        return outputAst;
    }
    private handleChunkNode(context: ScopeContext) {
        const { currentAnchor, metaParts, node, originMeta, transformGlobals } =
            context as Required<ScopeContext>;
        if (node.type === 'class') {
            const resolved = metaParts.class[node.value] || [
                // used to scope classes from js mixins
                { _kind: 'css', meta: originMeta, symbol: { _kind: 'class', name: node.value } },
            ];
            context.setCurrentAnchor({ name: node.value, type: 'class', resolved });
            const { symbol, meta } = getOriginDefinition(resolved);
            if (context.originMeta === meta && symbol[valueMapping.states]) {
                validateRuleStateDefinition(context.rule, meta, this.resolver, this.diagnostics);
            }
            this.scopeClassNode(symbol, meta, node, originMeta);
        } else if (node.type === 'element') {
            const resolved = metaParts.element[node.value] || [
                // provides resolution for native elements
                { _kind: 'css', meta: originMeta, symbol: { _kind: 'element', name: node.value } },
            ];
            context.setCurrentAnchor({ name: node.value, type: 'element', resolved });
            // native node does not resolve e.g. div
            if (resolved && resolved.length > 1) {
                const { symbol, meta } = getOriginDefinition(resolved);
                this.scopeClassNode(symbol, meta, node, originMeta);
            }
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
                if (!symbol[valueMapping.root]) {
                    continue;
                }

                const customSelector = meta.customSelectors[':--' + node.value];
                if (customSelector) {
                    this.handleCustomSelector(customSelector, meta, context, node.value, node);
                    return;
                }

                const requestedPart = meta.classes[node.value];

                if (symbol.alias || !requestedPart) {
                    // skip alias since they cannot add parts
                    continue;
                }

                resolved = this.resolveMetaParts(meta).class[node.value];

                // first definition of a part in the extends/alias chain
                context.setCurrentAnchor({
                    name: node.value,
                    type: 'pseudo-element',
                    resolved,
                });

                const resolvedPart = getOriginDefinition(resolved);

                if (!resolvedPart.symbol[valueMapping.root]) {
                    // insert nested combinator before internal custom element
                    context.insertNestedCombinatorBefore();
                }
                this.scopeClassNode(resolvedPart.symbol, resolvedPart.meta, node, originMeta);

                break;
            }

            if (!resolved) {
                // first definition of a part in the extends/alias chain
                context.setCurrentAnchor({
                    name: node.value,
                    type: 'pseudo-element',
                    resolved: [],
                });

                if (
                    !nativePseudoElements.includes(node.value) &&
                    !isVendorPrefixed(node.value) &&
                    !this.isDuplicateStScopeDiagnostic(context)
                ) {
                    this.diagnostics.warn(
                        context.rule,
                        transformerWarnings.UNKNOWN_PSEUDO_ELEMENT(node.value),
                        {
                            word: node.value,
                        }
                    );
                }
            }
        } else if (node.type === 'pseudo_class') {
            // handle nested pseudo classes
            if (node.nodes) {
                if (node.value === 'global') {
                    // :global(.a) -> .a
                    if (transformGlobals) {
                        flattenContainerSelector(node);
                    }
                    return;
                } else {
                    // pickup all nested selectors except nth initial selector
                    const innerSelectors = (
                        node.nodes[0] && node.nodes[0].type === `nth`
                            ? node.nodes.slice(1)
                            : node.nodes
                    ) as Selector[];
                    const nestedContext = context.createNestedContext(innerSelectors);
                    this.scopeSelectorAst(nestedContext);
                    /**
                     * ToDo: remove once elements is deprecated!
                     * support deprecated elements.
                     * used to flatten nested elements for some native pseudo classes.
                     */
                    if (node.value.match(/not|any|-\w+?-any|matches|is|where|has|local/)) {
                        // delegate elements of first selector
                        context.elements[context.selectorIndex].push(...nestedContext.elements[0]);
                    }
                }
            }
            //
            let found = false;
            for (const { symbol, meta } of currentAnchor.resolved) {
                const states = symbol[valueMapping.states];
                if (states && hasOwnProperty.call(states, node.value)) {
                    found = true;

                    setStateToNode(
                        states,
                        meta,
                        node.value,
                        node,
                        meta.namespace,
                        this.resolver,
                        this.diagnostics,
                        context.rule
                    );
                    break;
                }
            }
            if (
                !found &&
                !nativePseudoClasses.includes(node.value) &&
                !isVendorPrefixed(node.value) &&
                !this.isDuplicateStScopeDiagnostic(context)
            ) {
                this.diagnostics.warn(context.rule, stateErrors.UNKNOWN_STATE_USAGE(node.value), {
                    word: node.value,
                });
            }
        } else if (node.type === `nesting`) {
            const origin = originMeta.mappedSymbols[originMeta.root] as ClassSymbol;
            context.setCurrentAnchor({
                name: origin.name,
                type: 'class',
                resolved: metaParts.class[origin.name],
            });
        }
    }
    private isDuplicateStScopeDiagnostic(context: ScopeContext) {
        const stScopeSelector = getRuleScopeSelector(context.rule);
        const transformedScope = context.originMeta.transformedScopes?.[stScopeSelector || ``];
        if (transformedScope && context.chunkedSelector && context.chunk) {
            const currentChunkSelector = stringifySelector({
                type: `selector`,
                nodes: context.chunk,
                before: ``,
                after: ``,
                start: 0,
                end: 0,
            });
            const i = context.chunkedSelector.chunks.indexOf(context.chunk);
            for (const stScopeSelectorChunks of transformedScope) {
                // if we are in a chunk index that is in the rage of the @st-scope param
                if (i <= stScopeSelectorChunks.chunks.length) {
                    for (const chunk of stScopeSelectorChunks.chunks) {
                        const scopeChunkSelector = stringifySelector({
                            type: 'selector',
                            nodes: chunk,
                            before: ``,
                            after: ``,
                            start: 0,
                            end: 0,
                        });
                        // if the two chunks match the error is already reported by the @st-scope validation
                        if (scopeChunkSelector === currentChunkSelector) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    private handleCustomSelector(
        customSelector: string,
        meta: StylableMeta,
        context: ScopeContext,
        name: string,
        node: SelectorNode
    ) {
        const selectorListChunks = separateChunks2(
            parseSelectorWithCache(customSelector, { clone: true })
        );
        const hasSingleSelector = selectorListChunks.length === 1;
        removeFirstRootInEachSelectorChunk(selectorListChunks, meta);
        const internalContext = new ScopeContext(
            meta,
            mergeChunks(selectorListChunks),
            context.rule
        );
        const customAstSelectors = this.scopeSelectorAst(internalContext);
        customAstSelectors.forEach(setSingleSpaceOnSelectorLeft);
        if (hasSingleSelector && internalContext.currentAnchor) {
            context.setCurrentAnchor({
                name,
                type: 'pseudo-element',
                resolved: internalContext.currentAnchor.resolved,
            });
        } else {
            // unknown context due to multiple selectors
            context.setCurrentAnchor({
                name,
                type: 'pseudo-element',
                resolved: anyElementAnchor(meta).resolved,
            });
        }
        Object.assign(node, customAstSelectors[0]);
        // first one handled inline above
        for (let i = 1; i < customAstSelectors.length; i++) {
            const selectorNode = context.selectorAst[context.selectorIndex];
            const nodeIndex = selectorNode.nodes.indexOf(node);
            context.additionalSelectors.push(
                lazyCreateSelector(customAstSelectors[i], selectorNode, nodeIndex)
            );
        }
    }
    private scopeClassNode(symbol: any, meta: StylableMeta, node: any, originMeta: any) {
        if (symbol[valueMapping.global]) {
            const globalMappedNodes = symbol[valueMapping.global];
            flattenContainerSelector(node);
            node.nodes = globalMappedNodes;
            // ToDo: check if this is causes an issue with globals from an imported alias
            this.addGlobalsToMeta(globalMappedNodes, originMeta);
        } else {
            convertToClass(node);
            node.value = this.scopeEscape(symbol.name, meta.namespace);
        }
    }
    private resolveMetaParts(meta: StylableMeta): MetaParts {
        let metaParts = this.metaParts.get(meta);
        if (!metaParts) {
            const resolvedClasses: Record<
                string,
                Array<CSSResolve<ClassSymbol | ElementSymbol>>
            > = {};
            for (const className of Object.keys(meta.classes)) {
                resolvedClasses[className] = this.resolver.resolveExtends(
                    meta,
                    className,
                    false,
                    undefined,
                    (res, extend) => {
                        const decl = findRule(meta.ast, '.' + className);
                        if (decl) {
                            if (res && res._kind === 'js') {
                                this.diagnostics.error(
                                    decl,
                                    transformerWarnings.CANNOT_EXTEND_JS(),
                                    {
                                        word: decl.value,
                                    }
                                );
                            } else if (res && !res.symbol) {
                                this.diagnostics.error(
                                    decl,
                                    transformerWarnings.CANNOT_EXTEND_UNKNOWN_SYMBOL(extend.name),
                                    { word: decl.value }
                                );
                            } else {
                                this.diagnostics.error(
                                    decl,
                                    transformerWarnings.IMPORT_ISNT_EXTENDABLE(),
                                    { word: decl.value }
                                );
                            }
                        } else {
                            if (meta.classes[className] && meta.classes[className].alias) {
                                meta.ast.walkRules(new RegExp('\\.' + className), (rule) => {
                                    this.diagnostics.error(
                                        rule,
                                        transformerWarnings.UNKNOWN_IMPORT_ALIAS(className),
                                        { word: className }
                                    );
                                    return false;
                                });
                            }
                        }
                    }
                );
            }

            const resolvedElements: Record<
                string,
                Array<CSSResolve<ClassSymbol | ElementSymbol>>
            > = {};
            for (const k of Object.keys(meta.elements)) {
                resolvedElements[k] = this.resolver.resolveExtends(meta, k, true);
            }
            metaParts = { class: resolvedClasses, element: resolvedElements };
            this.metaParts.set(meta, metaParts);
        }
        return metaParts;
    }
    private addDevRules(meta: StylableMeta) {
        const metaParts = this.resolveMetaParts(meta);
        for (const [className, resolved] of Object.entries(metaParts.class)) {
            if (resolved.length > 1) {
                meta.outputAst!.walkRules(
                    '.' + this.scopeEscape(className, meta.namespace),
                    (rule) => {
                        const a = resolved[0];
                        const b = resolved[resolved.length - 1];
                        rule.after(
                            createWarningRule(
                                b.symbol.name,
                                this.scopeEscape(b.symbol.name, b.meta.namespace),
                                basename(b.meta.source),
                                a.symbol.name,
                                this.scopeEscape(a.symbol.name, a.meta.namespace),
                                basename(a.meta.source),
                                true
                            )
                        );
                    }
                );
            }
        }
    }
    private resetTransformProperties(meta: StylableMeta) {
        meta.globals = {};
        meta.transformedScopes = null;
        return (meta.outputAst = meta.ast.clone());
    }
}

function validateScopes(transformer: StylableTransformer, meta: StylableMeta) {
    const transformedScopes: Record<string, ChunkedSelector[]> = {};
    for (const scope of meta.scopes) {
        const len = transformer.diagnostics.reports.length;
        const rule = postcss.rule({ selector: scope.params });

        const context = new ScopeContext(
            meta,
            parseSelectorWithCache(rule.selector, { clone: true }),
            rule
        );
        transformedScopes[rule.selector] = separateChunks2(transformer.scopeSelectorAst(context));
        const ruleReports = transformer.diagnostics.reports.splice(len);

        ruleReports.forEach(({ message, type, options: { word } = {} }) => {
            if (type === 'error') {
                transformer.diagnostics.error(scope, message, { word: word || scope.params });
            } else {
                transformer.diagnostics.warn(scope, message, { word: word || scope.params });
            }
        });
    }
    return transformedScopes;
}

function removeFirstRootInEachSelectorChunk(
    selectorListChunks: ChunkedSelector[],
    meta: StylableMeta
) {
    selectorListChunks.forEach((selectorChunks) => {
        selectorChunks.chunks[0] = selectorChunks.chunks[0].filter((node) => {
            return !(node.type === 'class' && node.value === meta.root);
        });
    });
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

class ScopeContext {
    public additionalSelectors: Array<() => Selector> = [];
    public selectorIndex = -1;
    public elements: any[] = [];
    public transformGlobals = false;
    public metaParts?: MetaParts;
    public chunkedSelector?: ChunkedSelector;
    public chunk?: Chunk;
    public node?: SelectorNode;
    public currentAnchor?: ScopeAnchor;
    constructor(
        public originMeta: StylableMeta,
        public selectorAst: SelectorList,
        public rule: postcss.Rule
    ) {}
    public initRootAnchor(anchor: ScopeAnchor) {
        this.currentAnchor = anchor;
    }
    public setCurrentAnchor(anchor: ScopeAnchor) {
        if (this.selectorIndex !== undefined && this.selectorIndex !== -1) {
            this.elements[this.selectorIndex].push(anchor);
        }
        this.currentAnchor = anchor;
    }
    public insertNestedCombinatorBefore() {
        if (this.chunk && this.node) {
            const index = this.chunk.indexOf(this.node);
            this.chunk.splice(index, 0, {
                type: `combinator`,
                combinator: `space`,
                value: ` `,
                before: ``,
                after: ``,
                start: this.node.start,
                end: this.node.start,
                invalid: false,
            });
        } else {
            throw new Error(`how can this be!?`);
        }
    }
    public createNestedContext(selectorAst: SelectorList) {
        const ctx = new ScopeContext(this.originMeta, selectorAst, this.rule);
        Object.assign(ctx, this);
        ctx.selectorAst = selectorAst;

        ctx.selectorIndex = -1;
        ctx.elements = [];
        ctx.additionalSelectors = [];

        return ctx;
    }
}

interface MetaParts {
    class: Record<string, Array<CSSResolve<ClassSymbol | ElementSymbol>>>;
    element: Record<string, Array<CSSResolve<ClassSymbol | ElementSymbol>>>;
}
