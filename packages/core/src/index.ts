export { CssParser, cssObjectToAst, cssParse, safeParse } from './parser';
export {
    CacheItem,
    FileProcessor,
    MinimalFS,
    cachedProcessFile,
    processFn,
} from './cached-process-file';
export {
    CSSVarSymbol,
    ClassSymbol,
    ElementSymbol,
    ImportSymbol,
    Imported,
    KeyframesSymbol,
    RESERVED_ROOT_NAME,
    RefedMixin,
    SimpleSelector,
    StylableDirectives,
    StylableMeta,
    StylableProcessor,
    StylableSymbol,
    VarSymbol,
    createEmptyMeta,
    process,
    processNamespace,
    processorWarnings,
    validateScopingSelector,
} from './stylable-processor';

export { ensureStylableImports, parsePseudoImport, parseStImport } from './stylable-imports-tools';

export {
    KeyFrameWithNode,
    ResolvedElement,
    StylableExports,
    StylableResults,
    StylableTransformer,
    TransformHooks,
    TransformerOptions,
    postProcessor,
    replaceValueHook,
    transformerWarnings,
} from './stylable-transformer';
export {
    CUSTOM_SELECTOR_RE,
    expandCustomSelectors,
    findDeclaration,
    generateScopedCSSVar,
    getAlias,
    getSourcePath,
    isCSSVarProp,
    isValidClassName,
    isValidDeclaration,
    mergeRules,
    scopeCSSVar,
    transformMatchesOnRule,
} from './stylable-utils';
export {
    CSSResolve,
    CachedModule,
    JSResolve,
    JsModule,
    StylableResolver,
    StylableResolverCache,
    isInPath,
    resolverWarnings,
} from './stylable-resolver';
export { Diagnostic, DiagnosticOptions, DiagnosticType, Diagnostics } from './diagnostics';
export { File, MinimalFSSetup, createMinimalFS } from './memory-minimal-fs';
export {
    ArgValue,
    ExtendsValue,
    MappedStates,
    MixinValue,
    ReportWarning,
    SBTypesParsers,
    STYLABLE_NAMED_MATCHER,
    STYLABLE_VALUE_MATCHER,
    TypedClass,
    animationPropRegExp,
    getFormatterArgs,
    getNamedArgs,
    getStringValue,
    globalValueRegExp,
    groupValues,
    listOptions,
    mixinDeclRegExp,
    paramMapping,
    rootValueMapping,
    stKeys,
    stValues,
    stValuesMap,
    strategies,
    validateAllowedNodesUntil,
    valueMapping,
    valueParserWarnings,
} from './stylable-value-parsers';
export { StylableInfrastructure, createInfrastructure } from './create-infra-structure';
export { CreateProcessorOptions, Stylable, StylableConfig } from './stylable';
export {
    CSSObject,
    IStylableClassNameOptimizer,
    IStylableNamespaceOptimizer,
    IStylableOptimizer,
    ModuleResolver,
    OptimizeConfig,
    ParsedValue,
    PartialObject,
    StateArguments,
    StateParsedValue,
    StateTypeValidator,
} from './types';
export { appendMixin, appendMixins, mixinWarnings } from './stylable-mixins';
export {
    OnUrlCallback,
    UrlNode,
    assureRelativeUrlPrefix,
    collectAssets,
    fixRelativeUrls,
    isAsset,
    isExternal,
    isUrl,
    makeAbsolute,
} from './stylable-assets';
export {
    ResolvedFormatter,
    ValueFormatter,
    evalDeclarationValue,
    functionWarnings,
    processDeclarationValue,
    resolveArgumentsValue,
} from './functions';
export {
    Box,
    BoxedValueArray,
    BoxedValueMap,
    CustomValueExtension,
    CustomValueStrategy,
    JSValueExtension,
    box,
    createCustomValue,
    getBoxValue,
    isCustomValue,
    resolveCustomValues,
    stTypes,
    unbox,
} from './custom-values';
export { StateParamType, StateResult, SubValidator, systemValidators } from './state-validators';
export {
    isCssNativeFunction,
    nativeFunctions,
    nativeFunctionsDic,
    nativePseudoClasses,
    nativePseudoElements,
    reservedKeyFrames,
} from './native-reserved-lists';
export { noCollisionNamespace, packageNamespaceFactory } from './resolve-namespace-factories';
export { createDefaultResolver } from './module-resolver';
export { DiagnosticsMode, EmitDiagnosticsContext, emitDiagnostics } from './report-diagnostic';
export { visitMetaCSSDependenciesBFS } from './visit-meta-css-dependencies';
export { murmurhash3_32_gc } from './murmurhash';
export { TimedCacheOptions, timedCache } from './timed-cache';
import {
    booleanStateDelimiter,
    createBooleanStateClassName,
    createStateWithParamClassName,
    processPseudoStates,
    resolveStateParam,
    setStateToNode,
    stateErrors,
    stateMiddleDelimiter,
    stateWithParamDelimiter,
    validateStateArgument,
    validateStateDefinition,
} from './pseudo-states';
export const pseudoStates = {
    booleanStateDelimiter,
    createBooleanStateClassName,
    createStateWithParamClassName,
    processPseudoStates,
    resolveStateParam,
    setStateToNode,
    stateErrors,
    stateMiddleDelimiter,
    stateWithParamDelimiter,
    validateStateArgument,
    validateStateDefinition,
};
export { getRuleScopeSelector } from './helpers/rule';

// *** deprecated ***

import { wrapFunctionForDeprecation } from './helpers/deprecation';

import { isCompRoot as deprecatedIsCompRoot } from './helpers/selector';
/**@deprecated*/
export const isCompRoot = wrapFunctionForDeprecation(deprecatedIsCompRoot, {
    name: `isCompRoot`,
});

import {
    isChildOfAtRule as deprecatedIsChildOfAtRule,
    createWarningRule as deprecatedCreateWarningRule,
} from './helpers/rule';
/**@deprecated*/
export const isChildOfAtRule = wrapFunctionForDeprecation(deprecatedIsChildOfAtRule, {
    name: `isChildOfAtRule`,
});
/**@deprecated*/
export const createWarningRule = wrapFunctionForDeprecation(deprecatedCreateWarningRule, {
    name: `createWarningRule`,
});

import { getOriginDefinition as deprecatedGetOriginDefinition } from './helpers/resolve';
/**@deprecated*/
export const getOriginDefinition = wrapFunctionForDeprecation(deprecatedGetOriginDefinition, {
    name: `getOriginDefinition`,
});

export type { SRule, SDecl, DeclStylableProps } from './deprecated/postcss-ast-extension';
import { getDeclStylable as deprecatedGetDeclStylable } from './deprecated/postcss-ast-extension';
/**@deprecated*/
export const getDeclStylable = wrapFunctionForDeprecation(deprecatedGetDeclStylable, {
    name: `getDeclStylable`,
});

import {
    scopeSelector as deprecatedScopeSelector,
    createSubsetAst as deprecatedCreateSubsetAst,
    removeUnusedRules as deprecatedRemoveUnusedRules,
    findRule as deprecatedFindRule,
} from './deprecated/deprecated-stylable-utils';
/**@deprecated*/
export const scopeSelector = wrapFunctionForDeprecation(deprecatedScopeSelector, {
    name: `scopeSelector`,
});
/**@deprecated*/
export const createSubsetAst = wrapFunctionForDeprecation(deprecatedCreateSubsetAst, {
    name: `createSubsetAst`,
});
/**@deprecated*/
export const removeUnusedRules = wrapFunctionForDeprecation(deprecatedRemoveUnusedRules, {
    name: `removeUnusedRules`,
});
/**@deprecated*/
export const findRule = wrapFunctionForDeprecation(deprecatedFindRule, {
    name: `findRule`,
});

export type {
    SelectorChunk,
    SelectorChunk2,
    Visitor,
    SelectorAstNode,
    PseudoSelectorAstNode,
} from './deprecated/deprecated-selector-utils';
import {
    matchSelectorTarget as deprecatedMatchSelectorTarget,
    fixChunkOrdering as deprecatedFixChunkOrdering,
    filterChunkNodesByType as deprecatedFilterChunkNodesByType,
    separateChunks as deprecatedSeparateChunks,
    separateChunks2 as deprecatedSeparateChunks2,
    mergeChunks as deprecatedMergeChunks,
    matchAtMedia as deprecatedMatchAtMedia,
    matchAtKeyframes as deprecatedMatchAtKeyframes,
    isImport as deprecatedIsImport,
    isSimpleSelector as deprecatedIsSimpleSelector,
    isRootValid as deprecatedIsRootValid,
    isGlobal as deprecatedIsGlobal,
    createChecker as deprecatedCreateChecker,
    isNested as deprecatedIsNested,
    traverseNode as deprecatedTraverseNode,
    parseSelector as deprecatedParseSelector,
    stringifySelector as deprecatedStringifySelector,
    isNodeMatch as deprecatedIsNodeMatch,
    createSimpleSelectorChecker as deprecatedCreateSimpleSelectorChecker,
} from './deprecated/deprecated-selector-utils';
/**@deprecated*/
export const matchSelectorTarget = wrapFunctionForDeprecation(deprecatedMatchSelectorTarget, {
    name: `matchSelectorTarget`,
});
/**@deprecated*/
export const fixChunkOrdering = wrapFunctionForDeprecation(deprecatedFixChunkOrdering, {
    name: `fixChunkOrdering`,
});
/**@deprecated*/
export const filterChunkNodesByType = wrapFunctionForDeprecation(deprecatedFilterChunkNodesByType, {
    name: `filterChunkNodesByType`,
});
/**@deprecated*/
export const separateChunks = wrapFunctionForDeprecation(deprecatedSeparateChunks, {
    name: `separateChunks`,
});
/**@deprecated*/
export const separateChunks2 = wrapFunctionForDeprecation(deprecatedSeparateChunks2, {
    name: `separateChunks2`,
});
/**@deprecated*/
export const mergeChunks = wrapFunctionForDeprecation(deprecatedMergeChunks, {
    name: `mergeChunks`,
});
/**@deprecated*/
export const matchAtMedia = wrapFunctionForDeprecation(deprecatedMatchAtMedia, {
    name: `matchAtMedia`,
});
/**@deprecated*/
export const matchAtKeyframes = wrapFunctionForDeprecation(deprecatedMatchAtKeyframes, {
    name: `matchAtKeyframes`,
});
/**@deprecated*/
export const isImport = wrapFunctionForDeprecation(deprecatedIsImport, {
    name: `isImport`,
});
/**@deprecated*/
export const isSimpleSelector = wrapFunctionForDeprecation(deprecatedIsSimpleSelector, {
    name: `isSimpleSelector`,
});
/**@deprecated*/
export const isRootValid = wrapFunctionForDeprecation(deprecatedIsRootValid, {
    name: `isRootValid`,
});
/**@deprecated*/
export const isGlobal = wrapFunctionForDeprecation(deprecatedIsGlobal, {
    name: `isGlobal`,
});
/**@deprecated*/
export const createChecker = wrapFunctionForDeprecation(deprecatedCreateChecker, {
    name: `createChecker`,
});
/**@deprecated*/
export const isNested = wrapFunctionForDeprecation(deprecatedIsNested, {
    name: `isNested`,
});
/**@deprecated*/
export const isNodeMatch = wrapFunctionForDeprecation(deprecatedIsNodeMatch, {
    name: `isNodeMatch`,
});
/**@deprecated*/
export const traverseNode = wrapFunctionForDeprecation(deprecatedTraverseNode, {
    name: `traverseNode`,
    pleaseUse: `"import { walk } from '@tokey/css-selector-parser'"`,
});
/**@deprecated*/
export const parseSelector = wrapFunctionForDeprecation(deprecatedParseSelector, {
    name: `parseSelector`,
    pleaseUse: `"import { parseCssSelector } from '@tokey/css-selector-parser'"`,
});
/**@deprecated*/
export const stringifySelector = wrapFunctionForDeprecation(deprecatedStringifySelector, {
    name: `stringifySelector`,
    pleaseUse: `"import { stringifySelector } from '@tokey/css-selector-parser'"`,
});
/**@deprecated*/
export const createSimpleSelectorChecker = wrapFunctionForDeprecation(
    deprecatedCreateSimpleSelectorChecker,
    {
        name: `createSimpleSelectorChecker`,
    }
);
