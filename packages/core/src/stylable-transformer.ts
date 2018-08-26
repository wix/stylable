import cloneDeep from 'lodash.clonedeep';
import * as postcss from 'postcss';
import { FileProcessor } from './cached-process-file';
import { Diagnostics } from './diagnostics';
import { evalDeclarationValue } from './functions';
import {
    nativePseudoElements,
    reservedKeyFrames
} from './native-reserved-lists';
import { basename } from './path';
import {
    autoStateAttrName,
    transformPseudoStateSelector,
    validateStateDefinition
} from './pseudo-states';
import {
    createWarningRule,
    isChildOfAtRule,
    parseSelector,
    SelectorAstNode,
    stringifySelector,
    traverseNode } from './selector-utils';
import { appendMixins } from './stylable-mixins';
import {
    ClassSymbol, ElementSymbol, SDecl, SRule, StylableMeta, StylableSymbol
} from './stylable-processor';
import { CSSResolve, JSResolve, StylableResolver } from './stylable-resolver';
import {
    findDeclaration,
    findRule,
    getDeclStylable
} from './stylable-utils';
import { valueMapping } from './stylable-value-parsers';
import { Pojo } from './types';
import { deprecated } from './utils';

const isVendorPrefixed = require('is-vendor-prefixed');
const valueParser = require('postcss-value-parser');

export interface ResolvedElement {
    name: string;
    type: string;
    resolved: CSSResolve[];
}

export interface KeyFrameWithNode {
    value: string;
    node: postcss.Node;
}

export interface StylableResults {
    meta: StylableMeta;
    exports: Pojo<string>;
}

export interface ScopedSelectorResults {
    current: StylableMeta;
    symbol: StylableSymbol | null;
    selectorAst: SelectorAstNode;
    selector: string;
    elements: ResolvedElement[][];
}

export type replaceValueHook = (
    value: string,
    name: string | { name: string, args: string[] },
    isLocal: boolean,
    passedThrough: string[]) => string;

export type postProcessor<T = {}> = (
    stylableResults: StylableResults,
    transformer: StylableTransformer
) => StylableResults & T;

export interface TransformHooks {
    postProcessor?: postProcessor;
    replaceValueHook?: replaceValueHook;
}

type EnvMode = 'production' | 'development';

export interface Options {
    fileProcessor: FileProcessor<StylableMeta>;
    requireModule: (modulePath: string) => any;
    diagnostics: Diagnostics;
    delimiter?: string;
    keepValues?: boolean;
    replaceValueHook?: replaceValueHook;
    postProcessor?: postProcessor;
    mode?: EnvMode;
}

export interface AdditionalSelector {
    selectorNode: SelectorAstNode;
    node: SelectorAstNode;
    customElementChunk: string;
}

/* tslint:disable:max-line-length */
export const transformerWarnings = {
    SYMBOL_IN_USE(name: string) { return `symbol '${name}' is already in use`; },
    UNKNOWN_PSEUDO_ELEMENT(name: string) { return `unknown pseudo element "${name}"`; },
    IMPORT_ISNT_EXTENDABLE() { return 'import is not extendable'; },
    CANNOT_EXTEND_UNKNOWN_SYMBOL(name: string) { return `cannot extend unknown symbol "${name}"`; },
    CANNOT_EXTEND_JS() { return 'JS import is not extendable'; },
    KEYFRAME_NAME_RESERVED(name: string) { return `keyframes "${name}" is reserved`; },
    UNKNOWN_IMPORT_ALIAS(name: string) { return `cannot use alias for unknown import "${name}"`; },
    UNKNOWN_IMPORTED_FILE(path: string) { return `cannot resolve imported file: "${path}"`; },
    UNKNOWN_IMPORTED_SYMBOL(name: string, path: string) { return `cannot resolve imported symbol "${name}" in stylesheet "${path}"`; }
};
/* tslint:enable:max-line-length */

export class StylableTransformer {
    public fileProcessor: FileProcessor<StylableMeta>;
    public diagnostics: Diagnostics;
    public resolver: StylableResolver;
    public delimiter: string;
    public keepValues: boolean;
    public replaceValueHook: replaceValueHook | undefined;
    public postProcessor: postProcessor | undefined;
    public mode: EnvMode;
    constructor(options: Options) {
        this.diagnostics = options.diagnostics;
        this.delimiter = options.delimiter || '--';
        this.keepValues = options.keepValues || false;
        this.fileProcessor = options.fileProcessor;
        this.replaceValueHook = options.replaceValueHook;
        this.postProcessor = options.postProcessor;
        this.resolver = new StylableResolver(options.fileProcessor, options.requireModule);
        this.mode = options.mode || 'production';
    }
    public transform(meta: StylableMeta): StylableResults {
        const metaExports: Pojo<string> = {};
        const ast = meta.outputAst = meta.ast.clone();
        this.transformAst(ast, meta, metaExports);
        this.transformGlobals(ast);
        meta.transformDiagnostics = this.diagnostics;
        const result = { meta, exports: metaExports };

        return this.postProcessor ? this.postProcessor(result, this) : result;
    }
    public transformAst(
        ast: postcss.Root,
        meta: StylableMeta,
        metaExports?: Pojo<string>,
        variableOverride?: Pojo<string>,
        path: string[] = []) {

        const keyframeMapping = this.scopeKeyframes(ast, meta);

        ast.walkRules((rule: SRule) => {
            if (isChildOfAtRule(rule, 'keyframes')) { return; }
            rule.selector = this.scopeRule(meta, rule, metaExports);
        });

        ast.walkAtRules(/media$/, atRule => {
            atRule.params = evalDeclarationValue(
                this.resolver,
                atRule.params,
                meta,
                atRule,
                variableOverride,
                this.replaceValueHook,
                this.diagnostics,
                path.slice()
            );
        });

        for (const importObj of meta.imports) {
            const resolvedImport = this.resolver.resolveImported(importObj, '');

            if (!resolvedImport) {
                // warn about unknown imported files
                const fromDecl = importObj.rule.nodes &&
                    importObj.rule.nodes.find(decl => decl.type === 'decl' && decl.prop === valueMapping.from);

                if (fromDecl) {
                    this.diagnostics.warn(
                        fromDecl,
                        transformerWarnings.UNKNOWN_IMPORTED_FILE(importObj.fromRelative),
                        { word: importObj.fromRelative });
                }

            } else if (resolvedImport._kind === 'css') {
                // warn about unknown named imported symbols
                for (const name in importObj.named) {
                    const origName = importObj.named[name];
                    const resolvedSymbol = this.resolver.resolveImported(importObj, origName);
                    const namedDecl = importObj.rule.nodes &&
                        importObj.rule.nodes.find(decl => decl.type === 'decl' && decl.prop === valueMapping.named);

                    if (!resolvedSymbol!.symbol && namedDecl) {
                        this.diagnostics.warn(
                            namedDecl,
                            transformerWarnings.UNKNOWN_IMPORTED_SYMBOL(origName, importObj.fromRelative),
                            { word: origName });
                    }
                }
            }
        }

        ast.walkDecls(decl => {
            getDeclStylable(decl as SDecl).sourceValue = decl.value;

            // TODO: filter out all irrelevant directives
            switch (decl.prop) {
                case valueMapping.mixin:
                    break;
                case valueMapping.states:
                    validateStateDefinition(decl, meta, this.resolver, this.diagnostics);
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
                        path.slice()
                    );
            }
        });

        ast.walkRules((rule: SRule) => appendMixins(this, rule, meta, variableOverride, path));

        if (metaExports) {
            this.exportRootClass(meta, metaExports);
            this.exportLocalVars(meta, metaExports, variableOverride);
            this.exportKeyframes(keyframeMapping, metaExports);
        }
    }
    public exportLocalVars(meta: StylableMeta, metaExports: Pojo<string>, variableOverride?: Pojo<string>) {
        meta.vars.forEach(varSymbol => {
            if (metaExports[varSymbol.name]) {
                this.diagnostics.warn(
                    varSymbol.node,
                    transformerWarnings.SYMBOL_IN_USE(varSymbol.name),
                    { word: varSymbol.name }
                );
            } else {
                metaExports[varSymbol.name] = evalDeclarationValue(
                    this.resolver,
                    varSymbol.text,
                    meta,
                    varSymbol.node,
                    variableOverride
                );
            }
        });
    }
    public exportKeyframes(keyframeMapping: Pojo<KeyFrameWithNode>, metaExports: Pojo<string>) {
        Object.keys(keyframeMapping).forEach(name => {
            if (metaExports[name] === keyframeMapping[name].value) {
                this.diagnostics.warn(
                    keyframeMapping[name].node,
                    transformerWarnings.SYMBOL_IN_USE(name),
                    { word: name });
            } else {
                metaExports[name] = keyframeMapping[name].value;
            }
        });
    }
    public exportRootClass(meta: StylableMeta, metaExports: Pojo<string>) {
        const classExports: Pojo<string> = {};
        this.handleClass(
            meta, {
                type: 'class',
                name: meta.mappedSymbols[meta.root].name,
                nodes: []
            },
            meta.mappedSymbols[meta.root].name,
            classExports
        );
        metaExports[meta.root] = classExports[meta.mappedSymbols[meta.root].name];
    }
    public exportClass(meta: StylableMeta, name: string, classSymbol: ClassSymbol, metaExports?: Pojo<string>) {
        const scopedName = this.scope(name, meta.namespace);

        if (metaExports && !metaExports[name]) {
            const extend = classSymbol ? classSymbol[valueMapping.extends] : undefined;
            let exportedClasses = scopedName;

            if (extend && extend !== classSymbol) {
                let finalSymbol;
                let finalName;
                let finalMeta;
                if (extend._kind === 'class') {
                    finalSymbol = extend;
                    finalName = extend.name;
                    finalMeta = meta;
                } else if (extend._kind === 'import') {
                    const resolved = this.resolver.deepResolve(extend);
                    const found = findRule(meta.ast, '.' + classSymbol.name);
                    if (resolved && resolved._kind === 'css' && resolved.symbol) {
                        if (resolved.symbol._kind === 'class') {
                            finalSymbol = resolved.symbol;
                            finalName = resolved.symbol.name;
                            finalMeta = resolved.meta;
                        } else {
                            if (!!found) {
                                this.diagnostics.error(
                                    found,
                                    transformerWarnings.IMPORT_ISNT_EXTENDABLE(),
                                    { word: found.value });
                            }
                        }
                    } else {
                        // const found = findRule(meta.ast, '.' + classSymbol.name);
                        if (found && resolved) {
                            if (!resolved.symbol) {
                                const importNode = findDeclaration(
                                    extend.import, (node: any) => node.prop === valueMapping.named
                                );
                                this.diagnostics.error(
                                    found,
                                    transformerWarnings.CANNOT_EXTEND_UNKNOWN_SYMBOL(found.value),
                                    { word: found.value }
                                );
                            } else {
                                this.diagnostics.error(
                                    found,
                                    transformerWarnings.CANNOT_EXTEND_JS(),
                                    { word: found.value });
                            }
                        } else {
                            // const importNode = findDeclaration(
                            //     extend.import, (node: any) => node.prop === valueMapping.from
                            // );
                            // this.diagnostics.error(
                            //     importNode,
                            //     transformerWarnings.UNKNOWN_EXTENDED_SYMBOL(extend.import.),
                            //     { word: importNode.value }
                            // );
                        }
                    }
                }

                if (finalSymbol && finalName && finalMeta && !finalSymbol[valueMapping.root]) {
                    const classExports: Pojo<string> = {};
                    this.handleClass(finalMeta, { type: 'class', name: finalName, nodes: [] }, finalName, classExports);
                    if (classExports[finalName]) {
                        exportedClasses += ' ' + classExports[finalName];
                    } else {
                        console.error(
                            `something went wrong when exporting '${finalName}', ` +
                            `please file an issue in stylable. With specific use case`
                        );
                    }
                }
            }

            metaExports[name] = exportedClasses;
        }

        return scopedName;
    }
    public scopeKeyframes(ast: postcss.Root, meta: StylableMeta) {

        const keyframesExports: Pojo<KeyFrameWithNode> = {};

        ast.walkAtRules(/keyframes$/, atRule => {
            const name = atRule.params;
            if (!!~reservedKeyFrames.indexOf(name)) {
                this.diagnostics.error(atRule, transformerWarnings.KEYFRAME_NAME_RESERVED(name), { word: name });
            }
            if (!keyframesExports[name]) {
                keyframesExports[name] = {
                    value: this.scope(name, meta.namespace),
                    node: atRule
                };
            }
            atRule.params = keyframesExports[name].value;
        });

        ast.walkDecls(/animation$|animation-name$/, decl => {
            const parsed = valueParser(decl.value);
            parsed.nodes.forEach((node: any) => {
                const alias = keyframesExports[node.value] && keyframesExports[node.value].value;
                if (node.type === 'word' && Boolean(alias)) {
                    node.value = alias;
                }
            });
            decl.value = parsed.toString();
        });

        return keyframesExports;
    }
    public transformGlobals(ast: postcss.Root) {
        ast.walkRules(r => {
            const selectorAst = parseSelector(r.selector);
            traverseNode(selectorAst, node => {
                if (node.type === 'nested-pseudo-class' && node.name === 'global') {
                    node.type = 'selector';
                    return true;
                }
                return undefined;
            });
            r.selector = stringifySelector(selectorAst);
        });
    }
    public resolveSelectorElements(meta: StylableMeta, selector: string): ResolvedElement[][] {
        return this.scopeSelector(meta, selector, undefined, true).elements;
    }
    public scopeSelector(
        originMeta: StylableMeta,
        selector: string,
        metaExports?: Pojo<string>,
        calcPaths = false,
        rule?: postcss.Rule): ScopedSelectorResults {
        let meta = originMeta;
        let current = meta;
        let symbol: StylableSymbol | null = null;
        let nestedSymbol: StylableSymbol | null;
        let originSymbol: ClassSymbol | ElementSymbol;
        const selectorAst = parseSelector(selector);
        const addedSelectors: AdditionalSelector[] = [];
        const elements = selectorAst.nodes.map(selectorNode => {
            const selectorElements: ResolvedElement[] = [];
            traverseNode(selectorNode, node => {
                const { name, type } = node;
                if (calcPaths && (type === 'class' || type === 'element' || type === 'pseudo-element')) {
                    selectorElements.push({
                        name,
                        type,
                        resolved: this.resolver.resolveExtends(current, name, type === 'element', this)
                    });
                }
                if (type === 'selector' || type === 'spacing' || type === 'operator') {
                    if (nestedSymbol) {
                        symbol = nestedSymbol;
                        nestedSymbol = null;
                    } else {
                        meta = originMeta;
                        current = originMeta;
                        symbol = originMeta.classes[originMeta.root];
                        originSymbol = symbol;
                    }
                } else if (type === 'class') {
                    const next = this.handleClass(current, node, name, metaExports, rule);
                    originSymbol = current.classes[name];
                    symbol = next.symbol;
                    current = next.meta;
                } else if (type === 'element') {
                    const next = this.handleElement(current, node, name);
                    originSymbol = current.elements[name];
                    symbol = next.symbol;
                    current = next.meta;
                } else if (type === 'pseudo-element') {
                    const next = this.handlePseudoElement(current, node, name, selectorNode, addedSelectors, rule);
                    originSymbol = current.classes[name];
                    meta = current;
                    symbol = next.symbol;
                    current = next.meta;
                } else if (type === 'pseudo-class') {
                    current = transformPseudoStateSelector(
                        current, node, name, symbol, meta, originSymbol,
                        this.resolver, this.diagnostics, rule
                    );
                } else if (type === 'nested-pseudo-class') {
                    if (name === 'global') {
                        // node.type = 'selector';
                        return true;
                    }
                    nestedSymbol = symbol;
                } else if (type === 'invalid' && node.value === '&' && current.parent) {
                    const origin = current.mappedSymbols[current.root];
                    const next = this.handleClass(current, {
                        type: 'class',
                        nodes: [],
                        name: origin.name
                    }, origin.name);
                    originSymbol = current.classes[origin.name];
                    symbol = next.symbol;
                    current = next.meta;
                }
                /* do nothing */
                return undefined;
            });
            return selectorElements;
        });

        this.addAdditionalSelectors(addedSelectors, selectorAst);

        return {
            current,
            symbol,
            selectorAst,
            elements,
            selector: stringifySelector(selectorAst)
        };

    }
    public addAdditionalSelectors(addedSelectors: AdditionalSelector[], selectorAst: SelectorAstNode) {
        addedSelectors.forEach(s => {
            const clone = cloneDeep(s.selectorNode);
            const i = s.selectorNode.nodes.indexOf(s.node);
            if (i === -1) {
                throw new Error('not supported inside nested classes');
            } else {
                clone.nodes[i].value = s.customElementChunk;
            }
            selectorAst.nodes.push(clone);
        });
    }
    public applyRootScoping(meta: StylableMeta, selectorAst: SelectorAstNode) {
        const scopedRoot = (meta.mappedSymbols[meta.root] as ClassSymbol)[valueMapping.global] ||
            this.scope(meta.root, meta.namespace);
        selectorAst.nodes.forEach(selector => {
            const first = selector.nodes[0];
            /* This finds a transformed or non transform global selector */
            if (first &&
                (first.type === 'selector' || first.type === 'nested-pseudo-class') &&
                first.name === 'global'
            ) {
                return;
            }
            // -st-global can make anther global inside root
            if (first && first.nodes === scopedRoot) {
                return;
            }
            if (first && first.before && first.before === '.' + scopedRoot) {
                return;
            }
            if (first && first.type === 'invalid' && first.value === '&') {
                return;
            }
            if (!first || (first.name !== scopedRoot)) {
                selector.nodes = [
                    typeof scopedRoot !== 'string' ?
                        { type: 'selector', nodes: scopedRoot, name: 'global' } :
                        { type: 'class', name: scopedRoot, nodes: [] },
                    { type: 'spacing', value: ' ', name: '', nodes: [] },
                    ...selector.nodes
                ];
            }
        });
    }
    public scopeRule(
        meta: StylableMeta, rule: postcss.Rule, metaExports?: Pojo<string>): string {
        return this.scopeSelector(meta, rule.selector, metaExports, false, rule).selector;
    }
    public handleClass(
        meta: StylableMeta,
        node: SelectorAstNode,
        name: string,
        metaExports?: Pojo<string>,
        rule?: postcss.Rule): CSSResolve {

        const symbol = meta.classes[name];
        const extend = symbol ? symbol[valueMapping.extends] : undefined;
        if (!extend && symbol && symbol.alias) {
            let next = this.resolver.deepResolve(symbol.alias);
            if (next && next._kind === 'css' && next.symbol && next.symbol._kind === 'class') {
                const globalMappedNodes = next.symbol[valueMapping.global];
                if (globalMappedNodes) {
                    node.before = '';
                    node.type = 'selector';
                    node.nodes = globalMappedNodes;
                } else {
                    node.name = this.exportClass(next.meta, next.symbol.name, next.symbol, metaExports);
                }

                if (next.symbol[valueMapping.extends]) {
                    next = this.resolver.deepResolve(next.symbol[valueMapping.extends]);
                    if (next && next._kind === 'css') {
                        return next;
                    }
                } else {
                    return next;
                }
            } else if (rule) {
                this.diagnostics.error(
                    rule,
                    transformerWarnings.UNKNOWN_IMPORT_ALIAS(name),
                    { word: symbol.alias.name }
                );
            }
        }

        let scopedName = '';
        let globalScopedSelector = '';
        const globalMappedNodes = symbol && symbol[valueMapping.global];
        if (globalMappedNodes) {
            globalScopedSelector = stringifySelector({ type: 'selector', name: '', nodes: globalMappedNodes });
        } else {
            scopedName = this.exportClass(meta, name, symbol, metaExports);
        }

        if (globalScopedSelector) {
            node.before = '';
            node.type = 'selector';
            node.nodes = symbol[valueMapping.global] || [];
        } else {
            node.name = scopedName;
        }
        const next = this.resolver.deepResolve(extend);

        if (next && next._kind === 'css' && next.symbol && next.symbol._kind === 'class') {
            if (this.mode === 'development' && rule && (rule as SRule).selectorType === 'class') {
                rule.after(createWarningRule(
                    next.symbol.name,
                    this.scope(next.symbol.name, next.meta.namespace),
                    basename(next.meta.source),
                    name,
                    this.scope(symbol.name, meta.namespace),
                    basename(meta.source)));
            }
            return next;
        }

        // local
        if (extend && extend._kind === 'class') {
            if (extend === symbol && extend.alias) {
                const next = this.resolver.deepResolve(extend.alias);
                if (next && next._kind === 'css' && next.symbol) {
                    return next;
                }
            }
        }

        return { _kind: 'css', meta, symbol };
    }
    public handleElement(meta: StylableMeta, node: SelectorAstNode, name: string) {
        const tRule = meta.elements[name] as StylableSymbol;
        const extend = tRule ? meta.mappedSymbols[name] : undefined;
        const next = this.resolver.deepResolve(extend);
        if (next && next._kind === 'css' && next.symbol) {
            if (next.symbol._kind === 'class' && next.symbol[valueMapping.global]) {
                node.before = '';
                node.type = 'selector';
                node.nodes = next.symbol[valueMapping.global] || [];
            } else {
                node.type = 'class';
                node.name = this.scope(next.symbol.name, next.meta.namespace);
            }
            // node.name = (next.symbol as ClassSymbol)[valueMapping.global] ||
            //             this.scope(next.symbol.name, next.meta.namespace);
            return next;
        }

        return { meta, symbol: tRule };
    }
    public handlePseudoElement(
        meta: StylableMeta,
        node: SelectorAstNode,
        name: string,
        selectorNode: SelectorAstNode,
        addedSelectors: AdditionalSelector[],
        rule?: postcss.Rule): CSSResolve {

        let next: JSResolve | CSSResolve | null;

        const customSelector = meta.customSelectors[':--' + name];
        if (customSelector) {

            const rootRes = this.scopeSelector(meta, '.root', {}, false);
            const res = this.scopeSelector(meta, customSelector, {}, false);
            const rootEg = new RegExp('^\\s*' + rootRes.selector.replace(/\./, '\\.') + '\\s*');

            const selectors = res.selectorAst.nodes.map(sel => stringifySelector(sel).trim().replace(rootEg, ''));

            if (selectors[0]) {
                node.type = 'invalid'; /*just take it */
                node.before = ' ';
                node.value = selectors[0];
            }

            for (let i = 1/*start from second one*/; i < selectors.length; i++) {
                addedSelectors.push({
                    selectorNode,
                    node,
                    customElementChunk: selectors[i]
                });
            }

            if (res.selectorAst.nodes.length === 1 && res.symbol) {
                return { _kind: 'css', meta: res.current, symbol: res.symbol };
            }

            // this is an error mode fallback
            return { _kind: 'css', meta, symbol: { _kind: 'element', name: '*' } };

        }

        // find if the current symbol exsists in the initial meta;

        let symbol = meta.mappedSymbols[name];
        let current = meta;

        while (!symbol) {
            // go up the root extends path and find first symbol
            const root = current.mappedSymbols[current.root] as ClassSymbol;
            next = this.resolver.deepResolve(root[valueMapping.extends]);
            if (next && next._kind === 'css') {
                current = next.meta;
                symbol = next.meta.mappedSymbols[name];
            } else {
                break;
            }
        }

        if (symbol) {
            if (symbol._kind === 'class') {
                node.type = 'class';
                node.before = symbol[valueMapping.root] ? '' : ' ';
                next = this.resolver.deepResolve(symbol);

                if (symbol[valueMapping.global]) {
                    node.type = 'selector';
                    node.nodes = symbol[valueMapping.global] || [];
                } else {
                    if (symbol.alias && !symbol[valueMapping.extends]) {
                        if (next && next.meta && next.symbol) {
                            node.name = this.scope(next.symbol.name, next.meta.namespace);
                        } else {
                            // TODO: maybe warn on un resolved alias
                        }
                    } else {
                        node.name = this.scope(symbol.name, current.namespace);
                    }
                }

                if (next && next._kind === 'css') {
                    return next;
                }
            }
        } else if (rule) {
            if (nativePseudoElements.indexOf(name) === -1 && !isVendorPrefixed(name)) {
                this.diagnostics.warn(rule,
                    transformerWarnings.UNKNOWN_PSEUDO_ELEMENT(name),
                    { word: name });
            }
        }

        return { _kind: 'css', meta: current, symbol };
    }
    public cssStates(stateMapping: Pojo<boolean> | null | undefined, namespace: string) {
        return stateMapping ? Object.keys(stateMapping).reduce((states: Pojo<boolean>, key) => {
            if (stateMapping[key]) {
                states[autoStateAttrName(key, namespace)] = true;
            }
            return states;
        }, {}) : {};
    }
    public scope(name: string, namespace: string, delimiter: string = this.delimiter) {
        return namespace ? namespace + delimiter + name : name;
    }
}

export function removeSTDirective(root: postcss.Root) {
    const toRemove: postcss.Node[] = [];

    root.walkRules((rule: postcss.Rule) => {
        if (rule.nodes && rule.nodes.length === 0) {
            toRemove.push(rule);
            return;
        }
        rule.walkDecls((decl: postcss.Declaration) => {
            if (decl.prop.startsWith('-st-')) {
                toRemove.push(decl);
            }
        });
        if (rule.raws) {
            rule.raws = {
                after: '\n'
            };
        }
    });

    if (root.raws) {
        root.raws = {};
    }

    function removeRecursiveUpIfEmpty(node: postcss.Node) {
        const parent = node.parent;
        node.remove();
        if (parent && parent.nodes && parent.nodes.length === 0) {
            removeRecursiveUpIfEmpty(parent);
        }
    }
    toRemove.forEach(node => {
        removeRecursiveUpIfEmpty(node);
    });
}
