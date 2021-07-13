export * from './parser';
export * from './cached-process-file';
export * from './stylable-processor';
export * from './stylable-transformer';
export * from './stylable-utils';
export * from './stylable-resolver';
export * from './diagnostics';
export * from './memory-minimal-fs';
export * from './stylable-value-parsers';
export * from './create-infra-structure';
export * from './stylable';
export * from './types';
export * from './stylable-mixins';
export * from './stylable-assets';
export * from './functions';
export * from './custom-values';
export * from './state-validators';
export * from './native-reserved-lists';
export * from './resolve-namespace-factories';
export * from './module-resolver';
export * from './report-diagnostic';
export * from './visit-meta-css-dependencies';
export * from './murmurhash';
export * from './timed-cache';
export { getStylableAstData, setStylableAstData } from './helpers/stylable-ast-data';
export { getRuleScopeSelector } from './helpers/rule';

import * as pseudoStates from './pseudo-states';
export { pseudoStates };

// *** deprecated ***

import { wrapFunctionForDeprecation } from './helpers/deprecation';

export type { SRule, SDecl, DeclStylableProps } from './deprecated/postcss-ast-extension';
import { getDeclStylable as deprecatedGetDeclStylable } from './deprecated/postcss-ast-extension';
export const getDeclStylable = wrapFunctionForDeprecation(deprecatedGetDeclStylable, {
    name: `getDeclStylable`,
});

import {
    scopeSelector as deprecatedScopeSelector,
    createSubsetAst as deprecatedCreateSubsetAst,
    removeUnusedRules as deprecatedRemoveUnusedRules,
    findRule as deprecatedFindRule,
} from './deprecated/deprecated-stylable-utils';
export const scopeSelector = wrapFunctionForDeprecation(deprecatedScopeSelector, {
    name: `scopeSelector`,
});
export const createSubsetAst = wrapFunctionForDeprecation(deprecatedCreateSubsetAst, {
    name: `createSubsetAst`,
});
export const removeUnusedRules = wrapFunctionForDeprecation(deprecatedRemoveUnusedRules, {
    name: `removeUnusedRules`,
});
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
} from './deprecated/deprecated-selector-utils';
export const matchSelectorTarget = wrapFunctionForDeprecation(deprecatedMatchSelectorTarget, {
    name: `matchSelectorTarget`,
});
export const fixChunkOrdering = wrapFunctionForDeprecation(deprecatedFixChunkOrdering, {
    name: `fixChunkOrdering`,
});
export const filterChunkNodesByType = wrapFunctionForDeprecation(deprecatedFilterChunkNodesByType, {
    name: `filterChunkNodesByType`,
});
export const separateChunks = wrapFunctionForDeprecation(deprecatedSeparateChunks, {
    name: `separateChunks`,
});
export const separateChunks2 = wrapFunctionForDeprecation(deprecatedSeparateChunks2, {
    name: `separateChunks2`,
});
export const mergeChunks = wrapFunctionForDeprecation(deprecatedMergeChunks, {
    name: `mergeChunks`,
});
export const matchAtMedia = wrapFunctionForDeprecation(deprecatedMatchAtMedia, {
    name: `matchAtMedia`,
});
export const matchAtKeyframes = wrapFunctionForDeprecation(deprecatedMatchAtKeyframes, {
    name: `matchAtKeyframes`,
});
export const isImport = wrapFunctionForDeprecation(deprecatedIsImport, {
    name: `isImport`,
});
export const isSimpleSelector = wrapFunctionForDeprecation(deprecatedIsSimpleSelector, {
    name: `isSimpleSelector`,
});
export const isRootValid = wrapFunctionForDeprecation(deprecatedIsRootValid, {
    name: `isRootValid`,
});
export const isGlobal = wrapFunctionForDeprecation(deprecatedIsGlobal, {
    name: `isGlobal`,
});
export const createChecker = wrapFunctionForDeprecation(deprecatedCreateChecker, {
    name: `createChecker`,
});
export const isNested = wrapFunctionForDeprecation(deprecatedIsNested, {
    name: `isNested`,
});
export const isNodeMatch = wrapFunctionForDeprecation(deprecatedIsNodeMatch, {
    name: `isNodeMatch`,
});
export const traverseNode = wrapFunctionForDeprecation(deprecatedTraverseNode, {
    name: `traverseNode`,
    pleaseUse: `"import { walk } from '@tokey/css-selector-parser'"`,
});
export const parseSelector = wrapFunctionForDeprecation(deprecatedParseSelector, {
    name: `parseSelector`,
    pleaseUse: `"import { parseCssSelector } from '@tokey/css-selector-parser'"`,
});
export const stringifySelector = wrapFunctionForDeprecation(deprecatedStringifySelector, {
    name: `stringifySelector`,
    pleaseUse: `"import { stringifySelector } from '@tokey/css-selector-parser'"`,
});
