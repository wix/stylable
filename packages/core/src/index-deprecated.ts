import { wrapFunctionForDeprecation } from './helpers/deprecation';
export { CssParser, cssObjectToAst, cssParse } from './parser';
import { safeParse as deprecatedSafeParse } from './parser';
/**@deprecated*/
export const safeParse = wrapFunctionForDeprecation(deprecatedSafeParse, {
    name: `safeParse`,
    pleaseUse: `postcss-safe-parser`,
});
export { CacheItem, FileProcessor, cachedProcessFile, processFn } from './cached-process-file';
export type { StylableDirectives, MappedStates } from './features';
export { reservedKeyFrames } from './features/css-keyframes';
import { scopeCSSVar as scopeCSSVarDeprecated } from './features/css-custom-property';
/**@deprecated*/
export const scopeCSSVar = wrapFunctionForDeprecation(scopeCSSVarDeprecated, {
    name: `scopeCSSVar`,
    pleaseUse: `stylable.transformCustomProperty`,
});
export {
    StylableProcessor,
    createEmptyMeta,
    processorWarnings,
    validateScopingSelector,
} from './stylable-processor';
import { process as deprecatedProcess } from './stylable-processor';
/**@deprecated*/
export const process = wrapFunctionForDeprecation(deprecatedProcess, {
    name: `process`,
    pleaseUse: `stylable.analyze`,
});
import { ensureModuleImport, parseModuleImportStatement } from './helpers/import';
/**@deprecated*/
export const parseStylableImport = wrapFunctionForDeprecation(parseModuleImportStatement, {
    name: `parseStylableImport`,
    pleaseUse: `import { parseModuleImportStatement } from '@stylable/core'`,
});
/**@deprecated*/
export const ensureStylableImports = wrapFunctionForDeprecation(ensureModuleImport, {
    name: `ensureStylableImports`,
    pleaseUse: `import { ensureModuleImport } from '@stylable/core'`,
});
export { generateScopedCSSVar } from './helpers/css-custom-property';
import { validateCustomPropertyName } from './helpers/css-custom-property';
/**@deprecated*/
export const isCSSVarProp = wrapFunctionForDeprecation(validateCustomPropertyName, {
    name: `isCSSVarProp`,
    pleaseUse: `import { validateCustomPropertyName } from '@stylable/core'`,
});
export { globalValueRegExp } from './helpers/global';
import { GLOBAL_FUNC } from './helpers/global';
/**@deprecated*/
export const paramMapping = {
    global: GLOBAL_FUNC,
};
export { createDefaultResolver } from './module-resolver';
export { RESERVED_ROOT_NAME } from './stylable-meta';
export {
    KeyFrameWithNode,
    ResolvedElement,
    StylableExports,
    /** @deprecated use stylable.transform / stylable.transformSelector... */
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
    getAlias,
    getSourcePath,
    isValidClassName,
    isValidDeclaration,
    mergeRules,
    transformMatchesOnRule,
} from './stylable-utils';
export { JsModule, StylableResolverCache, isInPath, StylableResolver } from './stylable-resolver';
export { DiagnosticOptions } from './diagnostics';
export { File, MinimalFSSetup } from './deprecated/memory-minimal-fs';
import { createMinimalFS as createMinimalFSDeprecated } from './deprecated/memory-minimal-fs';
/**@deprecated*/
export const createMinimalFS = wrapFunctionForDeprecation(createMinimalFSDeprecated, {
    name: `createMinimalFS`,
});
export { ArgValue, ExtendsValue, SBTypesParsers } from './stylable-value-parsers';
export {
    valueMapping,
    rootValueMapping,
    stKeys,
    stValues,
    stValuesMap,
    STYLABLE_NAMED_MATCHER,
    mixinDeclRegExp,
    animationPropRegExp,
    STYLABLE_VALUE_MATCHER,
} from './deprecated/value-mapping';
export { TypedClass } from './deprecated/leftovers';
export { createStylableFileProcessor } from './create-stylable-processor';
export { CreateProcessorOptions } from './stylable';
export {
    CSSObject,
    IStylableClassNameOptimizer,
    IStylableNamespaceOptimizer,
    IStylableOptimizer,
    ModuleResolver,
    OptimizeConfig,
    PartialObject,
    StateArguments,
    StateParsedValue,
    StateTypeValidator,
} from './types';
import type { ParsedValue as DeprecatedParsedValue } from './types';
/**@deprecated*/
export type ParsedValue = DeprecatedParsedValue;
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
    functionWarnings,
    resolveArgumentsValue,
} from './functions';
import { evalDeclarationValue as evalDeclarationValueDeprecated } from './functions';
/**@deprecated*/
export const evalDeclarationValue = wrapFunctionForDeprecation(evalDeclarationValueDeprecated, {
    name: `evalDeclarationValue`,
    pleaseUse: `stylable.transformDecl`,
});
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
} from './native-reserved-lists';
export {
    noCollisionNamespace,
    packageNamespaceFactory,
    defaultBuildNamespace,
} from './resolve-namespace-factories';
export { DiagnosticsMode, EmitDiagnosticsContext, emitDiagnostics } from './report-diagnostic';
import { visitMetaCSSDependenciesBFS as deprecatedVisitMetaCSSDependenciesBFS } from './visit-meta-css-dependencies';
/**@deprecated use Stylable.getDependencies in v5*/
export const visitMetaCSSDependenciesBFS = deprecatedVisitMetaCSSDependenciesBFS;
export { murmurhash3_32_gc } from './murmurhash';
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
export {
    getFormatterArgs,
    getNamedArgs,
    getStringValue,
    groupValues,
    listOptions,
    validateAllowedNodesUntil,
    strategies,
    ReportWarning,
} from './helpers/value';

// *** deprecated ***

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
    createSubsetAst as deprecatedCreateSubsetAst, // report deprecation
    removeUnusedRules as deprecatedRemoveUnusedRules,
    findRule as deprecatedFindRule,
} from './deprecated/deprecated-stylable-utils';
/**@deprecated*/
export const scopeSelector = wrapFunctionForDeprecation(deprecatedScopeSelector, {
    name: `scopeSelector`,
});
/**@deprecated*/
export const createSubsetAst = deprecatedCreateSubsetAst;
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
export const matchSelectorTarget = deprecatedMatchSelectorTarget;
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
