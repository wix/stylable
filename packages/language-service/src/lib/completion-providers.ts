import path, { dirname } from 'path';
import type * as postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type ts from 'typescript';

import type {
    ClassSymbol,
    CSSResolve,
    CSSVarSymbol,
    ElementSymbol,
    Stylable,
    StylableMeta,
    VarSymbol,
} from '@stylable/core';
import {
    MappedStates,
    nativePseudoClasses,
    nativePseudoElements,
    ResolvedElement,
    STCustomSelector,
    STCustomState,
} from '@stylable/core/dist/index-internal';
import type { IFileSystem } from '@file-services/types';
import {
    classCompletion,
    codeMixinCompletion,
    Completion,
    cssMixinCompletion,
    extendCompletion,
    globalCompletion,
    importDirectives,
    importInternalDirective,
    namedCompletion,
    pseudoElementCompletion,
    rulesetDirectives,
    rulesetInternalDirective,
    stateCompletion,
    stateEnumCompletion,
    stateTypeCompletion,
    topLevelDirective,
    topLevelDirectives,
    valueCompletion,
    valueDirective,
} from './completion-types';
import { resolveStateTypeOrValidator } from './feature/pseudo-class';
import {
    extractJsModifierReturnType,
    extractTsSignature,
    getExistingNames,
    getNamedValues,
    isDirective,
    isInValue,
} from './provider';
import type { ExtendedTsLanguageService } from './types';
import { getAtRuleByPosition, isComment, isDeclaration } from './utils/postcss-ast-utils';
import type { CursorPosition, SelectorChunk } from './utils/selector-analyzer';
import type { LangServiceContext } from '../lib-new/lang-service-context';

const { hasOwnProperty } = Object.prototype;

export interface ProviderOptions {
    context: LangServiceContext;
    meta: StylableMeta;
    fs: IFileSystem;
    stylable: Stylable;
    src: string; // candidate for removal : meta.source
    tsLangService: ExtendedTsLanguageService; // candidate for removal
    resolvedElements: ResolvedElement[][]; // candidate for removal
    resolvedRoot: ResolvedElement; // candidate for removal
    parentSelector: postcss.Rule | null;
    astAtCursor: postcss.AnyNode; // candidate for removal
    lineChunkAtCursor: string;
    lastSelectoid: string; // candidate for removal
    fullLineText: string;
    position: ProviderPosition;
    resolved: CSSResolve[]; // candidate for removal
    currentSelector: string; // candidate for removal
    target: CursorPosition; // candidate for removal
    isMediaQuery: boolean;
    fakes: postcss.Rule[];
}

export interface CompletionProvider {
    provide(options: ProviderOptions): Completion[];
}

export class ProviderPosition {
    constructor(public line: number, public character: number) {}
}

export class ProviderRange {
    constructor(public start: ProviderPosition, public end: ProviderPosition) {}
}

export class ProviderLocation {
    constructor(public uri: string, public range: ProviderRange) {}
}

const cssPseudoClasses = [
    'active',
    'any',
    'checked',
    'default',
    'dir()',
    'disabled',
    'empty',
    'enabled',
    'first',
    'first-child',
    'first-of-type',
    'fullscreen',
    'focus',
    'hover',
    'indeterminate',
    'in-range',
    'invalid',
    'lang()',
    'last-child',
    'last-of-type',
    'left',
    'link',
    'not()',
    'nth-child()',
    'nth-last-child()',
    'nth-last-of-type()',
    'nth-of-type()',
    'only-child',
    'only-of-type',
    'optional',
    'out-of-range',
    'read-only',
    'read-write',
    'required',
    'right',
    'root',
    'scope',
    'target',
    'valid',
    'visited',
];

// const cssPseudoElements = [
//     '::after',
//     '::before',
//     '::cue',
//     '::first-letter',
//     '::first-line',
//     '::selection',
// ]

export function createRange(startLine: number, startPos: number, endline: number, endPos: number) {
    return new ProviderRange(
        new ProviderPosition(startLine, startPos),
        new ProviderPosition(endline, endPos)
    );
}

function createDirectiveRange(
    position: ProviderPosition,
    fullLineText: string,
    lineChunkAtCursor: string
): ProviderRange {
    return new ProviderRange(
        new ProviderPosition(
            position.line,
            Math.max(
                0,
                position.character -
                    (topLevelDirectives.customSelector.startsWith(fullLineText)
                        ? fullLineText.length
                        : lineChunkAtCursor.length)
            )
        ),
        position
    );
}

const importDeclarations: Array<keyof typeof importDirectives> = ['default', 'named', 'from'];
const simpleRulesetDeclarations: Array<keyof typeof rulesetDirectives> = [
    'extends',
    'states',
    'mixin',
];
const topLevelDeclarations: Array<keyof typeof topLevelDirectives> = [
    'root',
    'namespace',
    'vars',
    'import',
    'customSelector',
    'stScope',
    'stImport',
    'stGlobalCustomProperty',
];

// Providers
// Syntactic

// Inside :import ruleset, which is not inside media query
// If directive doesn't already exist
export const ImportInternalDirectivesProvider: CompletionProvider = {
    provide({
        parentSelector,
        isMediaQuery,
        fullLineText,
        position,
        lineChunkAtCursor,
    }: ProviderOptions): Completion[] {
        if (parentSelector && parentSelector.selector === ':import' && !isMediaQuery) {
            const res: Completion[] = [];
            importDeclarations.forEach((name) => {
                if (
                    parentSelector.nodes.every(
                        (n: any) =>
                            (isDeclaration(n) && importDirectives[name] !== n.prop) || isComment(n)
                    ) &&
                    importDirectives[name].startsWith(fullLineText.trim())
                ) {
                    res.push(
                        importInternalDirective(
                            name,
                            createDirectiveRange(position, fullLineText, lineChunkAtCursor)
                        )
                    );
                }
            });
            return res;
        } else {
            return [];
        }
    },
};

// Inside ruleset, which is not :import or :vars
// Only inside simple selector, except -st-mixin
// If directive doesn't already exist
export const RulesetInternalDirectivesProvider: CompletionProvider & {
    isSimpleSelector: (sel: string) => boolean;
} = {
    provide({
        parentSelector,
        isMediaQuery,
        fullLineText,
        position,
        lineChunkAtCursor,
    }: ProviderOptions): Completion[] {
        const res: Completion[] = [];
        if (
            parentSelector &&
            !(parentSelector.selector === ':import' || parentSelector.selector === ':vars')
        ) {
            if (
                parentSelector.nodes.every(
                    (n: any) =>
                        (isDeclaration(n) && rulesetDirectives.mixin !== n.prop) || isComment(n)
                ) &&
                rulesetDirectives.mixin.startsWith(fullLineText.trim())
            ) {
                res.push(
                    rulesetInternalDirective(
                        'mixin',
                        createDirectiveRange(position, fullLineText, lineChunkAtCursor)
                    )
                );
            }
            if (this.isSimpleSelector(parentSelector.selector) && !isMediaQuery) {
                simpleRulesetDeclarations
                    .filter((d) => d !== 'mixin')
                    .forEach((name) => {
                        if (
                            parentSelector.nodes.every(
                                (n) =>
                                    (isDeclaration(n) && rulesetDirectives[name] !== n.prop) ||
                                    isComment(n)
                            ) &&
                            rulesetDirectives[name].startsWith(fullLineText.trim())
                        ) {
                            res.push(
                                rulesetInternalDirective(
                                    name,
                                    createDirectiveRange(position, fullLineText, lineChunkAtCursor)
                                )
                            );
                        }
                    });
            }
            return res;
        } else {
            return [];
        }
    },
    isSimpleSelector(sel: string) {
        return !!/^\s*\.?[\w-]*$/.test(sel); // Only a single class or element
    },
};

// Only top level
// @st-namespace may not repeat
export const TopLevelDirectiveProvider: CompletionProvider = {
    provide({
        parentSelector,
        isMediaQuery,
        fullLineText,
        position,
        lineChunkAtCursor,
        meta,
        astAtCursor,
    }: ProviderOptions): Completion[] {
        if (!parentSelector) {
            if (
                !isMediaQuery &&
                !(
                    astAtCursor.type === 'atrule' &&
                    astAtCursor.name === topLevelDirectives.stScope.slice(1)
                )
            ) {
                return topLevelDeclarations
                    .filter(
                        (d) =>
                            !meta.sourceAst.source!.input.css.includes(
                                topLevelDirectives.namespace
                            ) || d !== 'namespace'
                    )
                    .filter((d) => topLevelDirectives[d].startsWith(fullLineText.trim()))
                    .map((d) =>
                        topLevelDirective(
                            d,
                            createDirectiveRange(position, fullLineText, lineChunkAtCursor)
                        )
                    );
            } else {
                return [
                    topLevelDirective(
                        'root',
                        createDirectiveRange(position, fullLineText, lineChunkAtCursor)
                    ),
                ];
            }
        } else {
            return [];
        }
    },
};

// Inside ruleset, which is not :import
// RHS of declaration
// Declaration is not -st-directive (except -st-mixin)
// Not inside another value()
export const ValueDirectiveProvider: CompletionProvider & {
    isInsideValueDirective: (wholeLine: string, pos: number) => boolean;
} = {
    provide({ parentSelector, fullLineText, position }: ProviderOptions): Completion[] {
        if (
            parentSelector &&
            !isDirective(fullLineText) &&
            !this.isInsideValueDirective(fullLineText, position.character) &&
            fullLineText.includes(':')
        ) {
            const parsed = postcssValueParser(
                fullLineText.slice(fullLineText.indexOf(':') + 1)
            ).nodes;
            const node = parsed[parsed.length - 1];
            if (
                node &&
                (node.type === 'div' ||
                    node.type === 'space' ||
                    (node.type === 'function' && !node.unclosed) ||
                    (node.type === 'word' && 'value()'.startsWith(node.value)))
            ) {
                return [
                    valueDirective(
                        new ProviderRange(
                            new ProviderPosition(
                                position.line,
                                ~fullLineText.indexOf(',')
                                    ? fullLineText.lastIndexOf(',') + 1
                                    : fullLineText.indexOf(':') + 1
                            ),
                            position
                        )
                    ),
                ];
            } else {
                return [];
            }
        } else {
            return [];
        }
    },

    isInsideValueDirective(wholeLine: string, pos: number) {
        if (!wholeLine.includes('value(')) {
            return false;
        }
        const line = wholeLine.slice(0, pos).slice(wholeLine.lastIndexOf('value('));
        let stack = 0;
        for (let i = 0; i <= line.length; i++) {
            if (line[i] === '(') {
                stack += 1;
            } else if (line[i] === ')') {
                stack -= 1;
            }
        }
        return stack > 0;
    },
};

// Selector level
export const GlobalCompletionProvider: CompletionProvider = {
    provide({
        parentSelector,
        fullLineText,
        position,
        lineChunkAtCursor,
        astAtCursor,
    }: ProviderOptions): Completion[] {
        if (
            !parentSelector &&
            !lineChunkAtCursor.endsWith('::') &&
            !isBetweenChars(fullLineText, position, '(', ')')
        ) {
            if (astAtCursor.type === 'root') {
                if (getAtRuleByPosition(astAtCursor, position, 'st-import')) {
                    return [];
                }
            }

            let offset = 0;
            if (fullLineText.lastIndexOf(':') !== -1) {
                if (
                    ':global()'.startsWith(
                        lineChunkAtCursor.slice(lineChunkAtCursor.lastIndexOf(':'))
                    )
                ) {
                    offset = lineChunkAtCursor.slice(lineChunkAtCursor.lastIndexOf(':')).length;
                }
            }
            return [
                globalCompletion(
                    new ProviderRange(
                        new ProviderPosition(position.line, position.character - offset),
                        position
                    )
                ),
            ];
        } else {
            return [];
        }
    },
};

// Semantic

// Selector level
// Not after :, unless entire chunk is :
export const SelectorCompletionProvider: CompletionProvider = {
    provide({
        parentSelector,
        fullLineText,
        position,
        lineChunkAtCursor,
        meta,
        fakes,
        stylable,
    }: ProviderOptions): Completion[] {
        if (!parentSelector && (lineChunkAtCursor === ':' || !lineChunkAtCursor.endsWith(':'))) {
            const comps: Completion[] = [];
            comps.push(
                ...Object.keys(meta.getAllClasses())
                    .filter(
                        (c) => c !== 'root' && fakes.findIndex((f) => f.selector === '.' + c) === -1
                    )
                    .map((c) =>
                        classCompletion(
                            c,
                            createDirectiveRange(position, fullLineText, lineChunkAtCursor)
                        )
                    )
            );
            comps.push(
                ...STCustomSelector.getCustomSelectorNames(meta).map((c) =>
                    classCompletion(
                        c,
                        createDirectiveRange(position, fullLineText, lineChunkAtCursor),
                        true
                    )
                )
            );
            const moreComps = meta
                .getImportStatements()
                .filter((imp) => imp.request.endsWith('st.css'))
                .reduce((acc: Completion[], imp) => {
                    if (acc.every((comp) => comp.label !== imp.defaultExport)) {
                        acc.push(
                            classCompletion(
                                imp.defaultExport,
                                createDirectiveRange(position, fullLineText, lineChunkAtCursor),
                                true
                            )
                        );
                    }
                    Object.keys(imp.named).forEach((exp) => {
                        const res = stylable.resolver.resolve(meta.getSymbol(exp));
                        if (
                            res &&
                            res._kind === 'css' &&
                            res.symbol &&
                            (res.symbol._kind === 'class' || res.symbol._kind === 'element') &&
                            acc.every((comp) => comp.label.replace('.', '') !== imp.named[exp])
                        ) {
                            acc.push(
                                classCompletion(
                                    imp.named[exp],
                                    createDirectiveRange(position, fullLineText, lineChunkAtCursor)
                                )
                            );
                        }
                    });
                    return acc;
                }, comps);
            return moreComps.filter((c) => c.label.startsWith(lineChunkAtCursor));
        } else {
            return [];
        }
    },
};

// Inside ruleset of simple selector, not :import or :vars
// RHS of -st-extends
export const ExtendCompletionProvider: CompletionProvider = {
    provide({ lineChunkAtCursor, position, meta, stylable }: ProviderOptions): Completion[] {
        if (lineChunkAtCursor.startsWith(`-st-extends`)) {
            const value = lineChunkAtCursor.slice(`-st-extends:`.length);
            const spaces = value.search(/\S|$/);
            const str = value.slice(spaces);
            const comps: string[][] = [[]];
            comps.push(
                ...Object.keys(meta.getAllClasses())
                    .filter((s) => s.startsWith(str))
                    .map((s) => [s, 'Local file'])
            );
            meta.getImportStatements().forEach((i) => {
                if (
                    i.defaultExport &&
                    i.defaultExport.startsWith(str) &&
                    i.from.endsWith('st.css')
                ) {
                    comps.push([i.defaultExport, i.request]);
                }
            });
            meta.getImportStatements().forEach((i) =>
                comps.push(
                    ...Object.keys(i.named)
                        .filter((s) => {
                            const res = stylable.resolver.resolve(meta.getSymbol(s));
                            return (
                                res &&
                                res._kind === 'css' &&
                                (res.symbol._kind === 'class' || res.symbol._kind === 'element')
                            );
                        })
                        .filter((s) => s.startsWith(str))
                        .map((s) => [s, i.request])
                )
            );
            return comps
                .slice(1)
                .map((c) =>
                    extendCompletion(
                        c[0],
                        c[1],
                        new ProviderRange(
                            new ProviderPosition(position.line, position.character - str.length),
                            position
                        )
                    )
                );
        } else {
            return [];
        }
    },
};

// Inside ruleset, which is not :import or :vars
// RHS of -st-extends
export const CssMixinCompletionProvider: CompletionProvider = {
    provide({ lineChunkAtCursor, meta, position, fullLineText }: ProviderOptions): Completion[] {
        if (lineChunkAtCursor.startsWith(`-st-mixin:`)) {
            const { names, lastName } = getExistingNames(fullLineText, position);
            const symbols = meta.getAllSymbols();
            return Object.keys(symbols)
                .filter((ms) => {
                    const importSymbol = symbols[ms];
                    return (
                        (importSymbol._kind === 'import' &&
                            importSymbol.import.request.endsWith('.st.css')) ||
                        importSymbol._kind === 'class'
                    );
                })
                .filter((ms) => ms.startsWith(lastName))
                .filter((ms) => !names.includes(ms))
                .map((ms) => {
                    const importSymbol = symbols[ms];
                    return cssMixinCompletion(
                        ms,
                        new ProviderRange(
                            new ProviderPosition(
                                position.line,
                                position.character - lastName.length
                            ),
                            position
                        ),
                        importSymbol._kind === 'import' ? importSymbol.import.request : 'Local file'
                    );
                });
        } else {
            return [];
        }
    },
};

// Mixin completions
// Inside ruleset, which is not :import or :vars
// Only inside simple selector
// RHS of -st-mixin
// There is  a JS/TS import
export const CodeMixinCompletionProvider: CompletionProvider = {
    provide({
        parentSelector,
        meta,
        fullLineText,
        lineChunkAtCursor,
        position,
        fs,
        tsLangService,
        stylable,
    }: ProviderOptions): Completion[] {
        if (
            meta
                .getImportStatements()
                .some((imp) => imp.request.endsWith('.ts') || imp.request.endsWith('.js')) &&
            !fullLineText.trim().startsWith(`-st-from`) &&
            parentSelector &&
            lineChunkAtCursor.startsWith(`-st-mixin:`)
        ) {
            if (fullLineText.lastIndexOf('(') > fullLineText.lastIndexOf(')')) {
                return [];
            }

            const { lastName } = getExistingNames(fullLineText, position);
            const symbols = meta.getAllSymbols();
            return Object.keys(symbols)
                .filter((ms) => symbols[ms]._kind === 'import')
                .filter((ms) => ms.startsWith(lastName))
                .filter((ms) => {
                    const res = stylable.resolver.resolve(symbols[ms]);
                    return res && res._kind === 'js';
                })
                .filter((ms) => isMixin(ms, meta, fs, tsLangService))
                .map((ms) => createCodeMixinCompletion(ms, lastName, position, meta));
        } else {
            return [];
        }
    },
};

// Inside ruleset, which is not :import
// RHS of any rule except -st-extends, -st-from
export const FormatterCompletionProvider: CompletionProvider = {
    provide({
        meta,
        fullLineText,
        parentSelector,
        lineChunkAtCursor,
        position,
        fs,
        tsLangService,
        stylable,
    }: ProviderOptions): Completion[] {
        if (
            meta
                .getImportStatements()
                .some((imp) => imp.request.endsWith('.ts') || imp.request.endsWith('.js')) &&
            !fullLineText.trim().startsWith(`-st-from`) &&
            !fullLineText.trim().startsWith(`-st-extends`) &&
            !fullLineText.trim().startsWith(`-st-named`) &&
            parentSelector &&
            ~fullLineText.indexOf(':') &&
            fullLineText.indexOf(':') < position.character &&
            !lineChunkAtCursor.startsWith(`-st-mixin:`)
        ) {
            const { lastName } = getExistingNames(fullLineText, position);
            const symbols = meta.getAllSymbols();
            return (
                Object.keys(symbols)
                    .filter((ms) => symbols[ms]._kind === 'import')
                    .filter((ms) => ms.startsWith(lastName))
                    .filter((ms) => {
                        const res = stylable.resolver.resolve(symbols[ms]);
                        return res && res._kind === 'js';
                    })
                    // .filter(ms => names.length === 0 || !~names.indexOf(ms))
                    .filter((ms) => !isMixin(ms, meta, fs, tsLangService))
                    .map((ms) => createCodeMixinCompletion(ms, lastName, position, meta))
            );
        } else {
            return [];
        }
    },
};

// Inside :import
// RHS of -st-named
// import exists
export const NamedCompletionProvider: CompletionProvider & {
    resolveImport: (
        importName: string,
        stylable: Stylable,
        meta: StylableMeta
    ) => StylableMeta | null;
} = {
    provide({
        parentSelector,
        astAtCursor,
        stylable,
        meta,
        position,
        fullLineText,
        src,
    }: ProviderOptions): Completion[] {
        const { isNamedValueLine, namedValues } = getNamedValues(src, position.line);
        if (isNamedValueLine) {
            let importName = '';
            if (
                parentSelector &&
                parentSelector.selector === ':import' &&
                (astAtCursor as postcss.Rule).nodes &&
                (astAtCursor as postcss.Rule).nodes.length
            ) {
                importName = (
                    (astAtCursor as postcss.Rule).nodes.find(
                        (n) => (n as postcss.Declaration).prop === `-st-from`
                    ) as postcss.Declaration
                ).value.replace(/'|"/g, '');
            } else if (
                astAtCursor.type === 'atrule' &&
                astAtCursor.name === topLevelDirectives.stImport.slice(1)
            ) {
                const parsed = postcssValueParser(astAtCursor.params);
                parsed.walk((n) => {
                    if (n.type === 'string') {
                        importName = n.value;
                    }
                });
            } else {
                return [];
            }

            const comps: string[][] = [[]];

            if (importName.endsWith('.st.css')) {
                const resolvedImport: StylableMeta | null = this.resolveImport(
                    importName,
                    stylable,
                    meta
                );
                if (resolvedImport) {
                    const { lastName } = getExistingNames(fullLineText, position);
                    getNamedCSSImports(
                        stylable,
                        comps,
                        resolvedImport,
                        lastName,
                        namedValues,
                        meta
                    );

                    return comps
                        .slice(1)
                        .map((c) =>
                            namedCompletion(
                                c[0],
                                new ProviderRange(
                                    new ProviderPosition(
                                        position.line,
                                        position.character - lastName.length
                                    ),
                                    new ProviderPosition(position.line, position.character)
                                ),
                                c[1],
                                c[2]
                            )
                        );
                }
            } else if (importName.endsWith('.js')) {
                let req: any;
                try {
                    req = (stylable as any).requireModule(
                        path.join(path.dirname(meta.source), importName)
                    );
                } catch (e) {
                    return [];
                }

                const { lastName } = getExistingNames(fullLineText, position);
                Object.keys(req).forEach((k) => {
                    if (typeof req[k] === 'function' && k.startsWith(lastName)) {
                        comps.push([k, importName, 'Mixin']);
                    }
                });
                return comps
                    .slice(1)
                    .map((c) =>
                        namedCompletion(
                            c[0],
                            new ProviderRange(
                                new ProviderPosition(
                                    position.line,
                                    position.character - lastName.length
                                ),
                                new ProviderPosition(position.line, position.character)
                            ),
                            c[1],
                            c[2]
                        )
                    );
            }
        }
        return [];
    },

    resolveImport(importName: string, stylable: Stylable, meta: StylableMeta): StylableMeta | null {
        return maybeResolveImport(importName, stylable, meta);
    },
};

function maybeResolveImport(
    importName: string,
    stylable: Stylable,
    meta: StylableMeta
): StylableMeta | null {
    let resolvedImport: StylableMeta | null = null;
    if (importName && importName.endsWith('.st.css')) {
        try {
            const imported = meta.getImportStatements().find((i) => i.request === importName)!;
            resolvedImport = stylable.fileProcessor.process(
                stylable.resolvePath(imported.context, imported.request)
            );
        } catch {
            /**/
        }
    }
    return resolvedImport;
}

export const StImportNamedCompletionProvider: CompletionProvider & {
    resolveImport: (
        importName: string,
        stylable: Stylable,
        meta: StylableMeta
    ) => StylableMeta | null;
} = {
    provide({
        astAtCursor,
        stylable,
        meta,
        position,
        fullLineText,
        src,
    }: ProviderOptions): Completion[] {
        const { isNamedValueLine, namedValues } = getNamedValues(src, position.line);
        let importName = '';

        if (astAtCursor.type === 'root') {
            const atRule = getAtRuleByPosition(astAtCursor, position, 'st-import');
            const comps: string[][] = [[]];

            if (isNamedValueLine && atRule) {
                const parsed = postcssValueParser(atRule.params);
                parsed.walk((n) => {
                    if (n.type === 'string') {
                        importName = n.value;
                    }
                });

                if (importName.endsWith('.st.css')) {
                    const resolvedImport: StylableMeta | null = this.resolveImport(
                        importName,
                        stylable,
                        meta
                    );

                    if (resolvedImport) {
                        const { lastName } = getExistingNames(fullLineText, position);

                        getNamedCSSImports(
                            stylable,
                            comps,
                            resolvedImport,
                            lastName,
                            namedValues,
                            meta
                        );

                        return comps
                            .slice(1)
                            .map((c) =>
                                namedCompletion(
                                    c[0],
                                    new ProviderRange(
                                        new ProviderPosition(
                                            position.line,
                                            position.character - lastName.length
                                        ),
                                        new ProviderPosition(position.line, position.character)
                                    ),
                                    c[1],
                                    c[2]
                                )
                            );
                    }
                } else if (importName.endsWith('.js')) {
                    let req: any;
                    try {
                        req = (stylable as any).requireModule(
                            path.join(path.dirname(meta.source), importName)
                        );
                    } catch (e) {
                        return [];
                    }

                    const { lastName } = getExistingNames(fullLineText, position);
                    Object.keys(req).forEach((k) => {
                        if (typeof req[k] === 'function' && k.startsWith(lastName)) {
                            comps.push([k, importName, 'Mixin']);
                        }
                    });
                    return comps
                        .slice(1)
                        .map((c) =>
                            namedCompletion(
                                c[0],
                                new ProviderRange(
                                    new ProviderPosition(
                                        position.line,
                                        position.character - lastName.length
                                    ),
                                    new ProviderPosition(position.line, position.character)
                                ),
                                c[1],
                                c[2]
                            )
                        );
                }
            }
        }

        return [];
    },

    resolveImport(importName: string, stylable: Stylable, meta: StylableMeta): StylableMeta | null {
        return maybeResolveImport(importName, stylable, meta);
    },
};

export const PseudoElementCompletionProvider: CompletionProvider = {
    provide({
        parentSelector,
        resolved,
        resolvedElements,
        resolvedRoot,
        lastSelectoid,
        lineChunkAtCursor,
        meta,
        position,
        fullLineText,
    }: ProviderOptions): Completion[] {
        let comps: any[] = [];
        if (
            !parentSelector &&
            resolved.length > 0 &&
            !isBetweenChars(fullLineText, position, '(', ')')
        ) {
            const [firstResolvedElement] = resolvedElements;
            const secondLastNode = firstResolvedElement[firstResolvedElement.length - 2];
            let lastNode = firstResolvedElement[firstResolvedElement.length - 1] || resolvedRoot;
            if (
                secondLastNode &&
                lastNode.type === 'pseudo-element' &&
                nativePseudoElements.includes(lastNode.name)
            ) {
                lastNode = secondLastNode;
            }
            const states = lastNode.resolved.reduce((acc, cur) => {
                if (cur.symbol._kind === 'class') {
                    const symbolStates = cur.symbol[`-st-states`];
                    if (symbolStates) {
                        acc = acc.concat(Object.keys(symbolStates));
                    }
                }
                return acc;
            }, cssPseudoClasses);

            let filter = lastNode.resolved.length
                ? states.includes(lastSelectoid.replace(':', ''))
                    ? ''
                    : lastSelectoid.replace(':', '')
                : lastNode.name;

            const scope = filter
                ? secondLastNode?.type === 'pseudo-element' &&
                  nativePseudoElements.includes(secondLastNode.name)
                    ? firstResolvedElement[firstResolvedElement.length - 3]
                    : secondLastNode
                : lastNode;

            const colons = lineChunkAtCursor.match(/:*$/)![0].length;

            scope?.resolved.forEach((res) => {
                if (!(res.symbol as ClassSymbol)[`-st-root`]) {
                    return;
                }

                comps = comps.concat(
                    Object.keys(res.meta.getAllClasses())
                        .concat(
                            STCustomSelector.getCustomSelectorNames(res.meta).map((s) =>
                                s.slice(':--'.length)
                            )
                        )
                        .filter((e) => e.startsWith(filter) && e !== 'root')
                        .map((c) => {
                            let relPath = path.relative(path.dirname(meta.source), res.meta.source);
                            if (!relPath.startsWith('.')) {
                                relPath = './' + relPath;
                            }

                            return pseudoElementCompletion(
                                c,
                                relPath,
                                new ProviderRange(
                                    new ProviderPosition(
                                        position.line,
                                        position.character - (filter ? filter.length + 2 : colons)
                                    ),
                                    new ProviderPosition(position.line, position.character)
                                )
                            );
                        })
                );
            });

            let otherScope;
            const chunksSplitByPseudo = lineChunkAtCursor.split('::');
            if (
                !filter &&
                chunksSplitByPseudo.length > 1 &&
                chunksSplitByPseudo[chunksSplitByPseudo.length - 1] === scope.name
            ) {
                otherScope = resolvedElements[0][resolvedElements[0].length - 2];
                filter = scope.name;
            }
            if (otherScope) {
                otherScope.resolved.forEach((res) => {
                    if (!(res.symbol as ClassSymbol)[`-st-root`]) {
                        return;
                    }

                    comps = comps.concat(
                        Object.keys(res.meta.getAllClasses())
                            .concat(
                                STCustomSelector.getCustomSelectorNames(res.meta).map((s) =>
                                    s.slice(':--'.length)
                                )
                            )
                            .filter((e) => e.startsWith(filter) && e !== 'root')
                            .map((c) => {
                                let relPath = path.relative(
                                    path.dirname(meta.source),
                                    res.meta.source
                                );
                                if (!relPath.startsWith('.')) {
                                    relPath = './' + relPath;
                                }

                                return pseudoElementCompletion(
                                    c,
                                    relPath,
                                    new ProviderRange(
                                        new ProviderPosition(
                                            position.line,
                                            position.character -
                                                (filter ? filter.length + 2 : colons)
                                        ),
                                        new ProviderPosition(position.line, position.character)
                                    )
                                );
                            })
                    );
                });
            }
        }
        return comps;
    },
};

function getNamedCSSImports(
    stylable: Stylable,
    comps: string[][],
    resolvedImport: StylableMeta,
    lastName: string,
    namedValues: string[],
    meta: StylableMeta
) {
    const namedSet = new Set(namedValues);
    for (const [symbolName, symbol] of Object.entries(resolvedImport.getAllSymbols())) {
        if (symbol._kind === 'cssVar' && !!symbol.alias) {
            if (symbol.name.startsWith('--')) {
                const importedVar = stylable.createResolver({}).deepResolve(symbol);
                if (
                    importedVar &&
                    importedVar._kind === 'css' &&
                    importedVar.symbol &&
                    importedVar.symbol._kind === 'cssVar'
                ) {
                    addCompletion(symbolName, importedVar.meta, importedVar.symbol);
                }
            }
        } else if (symbol._kind !== `import`) {
            addCompletion(symbolName, meta, symbol);
        }
    }

    function addCompletion(
        symbolName: string,
        meta: StylableMeta,
        symbol: VarSymbol | ClassSymbol | ElementSymbol | CSSVarSymbol
    ) {
        if (symbolName.slice(0, -1).startsWith(lastName) && !namedSet.has(symbolName)) {
            comps.push([
                symbolName,
                path.relative(meta.source, resolvedImport.source).slice(1).replace(/\\/g, '/'),
                createCompletionDetail(symbol),
            ]);
        }
    }
}

function createCompletionDetail(symbol: VarSymbol | ClassSymbol | ElementSymbol | CSSVarSymbol) {
    switch (symbol._kind) {
        case 'class':
            return 'Stylable class';
        case 'cssVar':
            return `${symbol.global ? 'Global ' : ''}${symbol.name}`;
        case 'var':
            return symbol.text;
        case 'element':
            return 'Stylable element';
    }
}

function isNodeRule(node: any): node is postcss.Rule {
    return node.type === 'rule';
}

function isPositionInDecl(position: ProviderPosition, decl: postcss.Declaration) {
    const srcStart = decl.source && decl.source.start;
    const srcEnd = decl.source && decl.source.end;

    if (srcStart && srcEnd) {
        const srcStartLine = srcStart.line - 1;
        const srcEndLine = srcEnd.line - 1;
        const srcStartChar = srcStart.column - 1;
        const srcEndChar = srcEnd.column - 1;

        if (srcStartLine < position.line && srcEndLine > position.line) {
            return true;
        } else if (srcStartLine === position.line && srcEndLine === position.line) {
            if (srcStartChar <= position.character && srcEndChar >= position.character) {
                return true;
            }
        }
    }

    return false;
}

export const StateTypeCompletionProvider: CompletionProvider = {
    provide({ astAtCursor, fullLineText, position }: ProviderOptions): Completion[] {
        const acc: Completion[] = [];

        if (isNodeRule(astAtCursor)) {
            const declNodes = astAtCursor.nodes;

            if (declNodes) {
                const stateDeclInPos = declNodes.find((decl: postcss.ChildNode) => {
                    if (
                        decl.type === 'decl' &&
                        decl.prop === `-st-states` &&
                        isPositionInDecl(position, decl)
                    ) {
                        return true;
                    }

                    return false;
                });

                if (stateDeclInPos) {
                    const toSuggest = resolveStateTypeOrValidator(position, fullLineText);
                    const types = Object.keys(STCustomState.systemValidators);
                    const input = getStateDefinitionInput(fullLineText, position);

                    // validator completion
                    if (typeof toSuggest === 'string') {
                        const validators = STCustomState.systemValidators[toSuggest].subValidators;

                        if (validators) {
                            const validatorNames = Object.keys(validators);

                            let relevantValidators = validatorNames.filter((t) =>
                                t.startsWith(input)
                            );
                            relevantValidators = relevantValidators.length
                                ? relevantValidators
                                : validatorNames;

                            relevantValidators.forEach((validator) => {
                                acc.push(
                                    stateTypeCompletion(
                                        validator,
                                        `Stylable pseudo-class ${toSuggest} validators`,
                                        new ProviderRange(
                                            new ProviderPosition(
                                                position.line,
                                                position.character - input.length
                                            ),
                                            position
                                        )
                                    )
                                );
                            });
                        }
                        // type completion
                    } else if (typeof toSuggest === 'boolean' && toSuggest) {
                        let relevantTypes = types.filter((t) => t.startsWith(input));
                        relevantTypes = relevantTypes.length ? relevantTypes : types;

                        relevantTypes.forEach((type) => {
                            acc.push(
                                stateTypeCompletion(
                                    type,
                                    'Stylable pseudo-class types',
                                    new ProviderRange(
                                        new ProviderPosition(
                                            position.line,
                                            position.character - input.length
                                        ),
                                        position
                                    )
                                )
                            );
                        });
                    }
                }
            }
        }

        return acc;
    },
};

export const StateSelectorCompletionProvider: CompletionProvider = {
    provide({
        parentSelector,
        lineChunkAtCursor,
        resolvedElements,
        resolvedRoot,
        target,
        lastSelectoid,
        meta,
        position,
        fullLineText,
    }: ProviderOptions): Completion[] {
        if (
            !parentSelector &&
            !lineChunkAtCursor.endsWith('::') &&
            !isBetweenChars(fullLineText, position, '(', ')')
        ) {
            let lastNode = resolvedElements[0][resolvedElements[0].length - 1] || resolvedRoot;
            if (
                lastNode?.type === 'pseudo-element' &&
                nativePseudoElements.includes(lastNode.name)
            ) {
                lastNode = resolvedElements[0][resolvedElements[0].length - 2];
            }
            const chunk = Array.isArray(target.focusChunk)
                ? target.focusChunk[target.focusChunk.length - 1]
                : target.focusChunk;
            const chunkyStates =
                chunk && (chunk as SelectorChunk).states ? (chunk as SelectorChunk).states : [];

            const allStates = collectStates(lastNode);

            const newStates = lastNode.resolved.reduce((acc, cur) => {
                let relPath = path.relative(path.dirname(meta.source), cur.meta.source);
                if (!relPath.startsWith('.')) {
                    relPath = './' + relPath;
                }
                const symbol = cur.symbol;
                if (symbol._kind === 'class') {
                    const symbolStates = symbol[`-st-states`];

                    if (symbolStates) {
                        Object.keys(symbolStates).forEach((k) => {
                            if (
                                !acc[k] &&
                                // selectoid is a substring of current state
                                (k.slice(0, -1).startsWith(lastSelectoid.replace(':', '')) ||
                                    // selectoid is a CSS native pseudo-sclass
                                    nativePseudoClasses.includes(lastSelectoid.replace(':', '')) ||
                                    hasOwnProperty.call(
                                        allStates,
                                        lastSelectoid.replace(':', '')
                                    )) &&
                                chunkyStates.every((cs) => cs !== k)
                            ) {
                                const symbolStates = symbol[`-st-states`];
                                const stateDef = symbolStates && symbolStates[k];

                                // if (stateDef) {
                                const stateType =
                                    stateDef && typeof stateDef === 'object' ? stateDef.type : null;
                                acc[k] = {
                                    path: meta.source === cur.meta.source ? 'Local file' : relPath,
                                    hasParam: !!stateDef,
                                    type: stateType,
                                };
                                // }
                            }
                        });
                    }
                }
                return acc;
            }, {} as { [k: string]: { path: string; hasParam: boolean; type: string | null } });

            const states = Object.keys(newStates).map((k) => {
                return { name: k, state: newStates[k] };
            });

            if (states.length === 0) {
                return [];
            }

            const lastState = lastSelectoid.replace(':', '');
            const realState =
                hasOwnProperty.call(allStates, lastState) ||
                nativePseudoClasses.includes(lastState);

            return states.reduce((acc: Completion[], st) => {
                acc.push(
                    stateCompletion(
                        st.name,
                        st.state.path,
                        new ProviderRange(
                            new ProviderPosition(
                                position.line,
                                lastState
                                    ? realState
                                        ? position.character -
                                          (lineChunkAtCursor.endsWith(':') ? 1 : 0)
                                        : position.character -
                                          (lastState.length + 1) -
                                          (lineChunkAtCursor.endsWith(':') ? 1 : 0)
                                    : position.character - (lineChunkAtCursor.endsWith(':') ? 1 : 0)
                            ),
                            position
                        ),
                        st.state.type,
                        st.state.hasParam
                    )
                );
                return acc;
            }, []);
        } else {
            return [];
        }
    },
};

export const StateEnumCompletionProvider: CompletionProvider = {
    provide({
        meta,
        astAtCursor,
        fullLineText,
        lineChunkAtCursor,
        position,
        lastSelectoid,
        resolvedElements,
        resolvedRoot,
    }: ProviderOptions): Completion[] {
        let acc: Completion[] = [];
        const ast = astAtCursor;

        if (!lineChunkAtCursor.endsWith('::') && (ast.type === 'root' || ast.type === 'atrule')) {
            if (lastSelectoid.startsWith(':')) {
                const stateName = lastSelectoid.slice(1);
                const lastNode =
                    resolvedElements[0][resolvedElements[0].length - 1] || resolvedRoot;

                const resolvedStates: MappedStates = collectStates(lastNode);
                const resolvedState = resolvedStates[stateName];
                if (
                    resolvedState &&
                    typeof resolvedState !== 'string' &&
                    (resolvedState.type === 'enum' ||
                        (STCustomState.isTemplateState(resolvedState) &&
                            resolvedState.params[0].type === 'enum'))
                ) {
                    const resolvedStateNode = lastNode.resolved.find(({ symbol }: any) => {
                        const states = symbol['-st-states'];
                        return states?.[stateName] === resolvedState;
                    });
                    if (resolvedStateNode) {
                        const enumStateParam = STCustomState.isTemplateState(resolvedState)
                            ? resolvedState.params[0]
                            : resolvedState;
                        let existingInput = fullLineText.slice(0, position.character);
                        existingInput = existingInput.slice(existingInput.lastIndexOf('(') + 1);

                        if (enumStateParam?.arguments.every((opt) => typeof opt === 'string')) {
                            const options = enumStateParam.arguments as string[];
                            let filteredOptions = options.filter((opt: string) =>
                                opt.startsWith(existingInput)
                            );
                            filteredOptions = filteredOptions.length ? filteredOptions : options;

                            let from = 'Local file';
                            if (meta.source !== resolvedStateNode.meta.source) {
                                from = path.relative(
                                    path.dirname(meta.source),
                                    resolvedStateNode.meta.source
                                );
                                if (!from.startsWith('.')) {
                                    from = './' + from;
                                }
                            }

                            acc = filteredOptions.map((opt: string) =>
                                stateEnumCompletion(
                                    opt,
                                    from,
                                    new ProviderRange(
                                        new ProviderPosition(
                                            position.line,
                                            position.character - existingInput.length
                                        ),
                                        position
                                    )
                                )
                            );
                        }
                    }
                }
            }
        }

        return acc;
    },
};

export const ValueCompletionProvider: CompletionProvider = {
    provide({ fullLineText, position, meta, stylable }: ProviderOptions): Completion[] {
        if (isInValue(fullLineText, position)) {
            const inner = fullLineText
                .slice(0, fullLineText.indexOf(')', position.character) + 1)
                .slice(
                    fullLineText
                        .slice(0, fullLineText.indexOf(')', position.character) + 1)
                        .lastIndexOf('(')
                )
                .replace('(', '')
                .replace(')', '')
                .trim();

            const comps: Completion[] = [];
            Object.values(meta.getAllStVars()).forEach((v) => {
                if (v.name.startsWith(inner)) {
                    const value = stylable.transformDecl(meta, `unknown-prop`, v.text).value;
                    comps.push(
                        valueCompletion(
                            v.name,
                            'Local variable',
                            value,
                            new ProviderRange(
                                new ProviderPosition(
                                    position.line,
                                    position.character - inner.length
                                ),
                                position
                            )
                        )
                    );
                }
            });

            const importVars: any[] = [];
            meta.getImportStatements().forEach((imp) => {
                try {
                    const resolvedPath = stylable.resolvePath(dirname(meta.source), imp.request);
                    Object.values(
                        stylable.fileProcessor.process(resolvedPath).getAllStVars()
                    ).forEach((v) =>
                        importVars.push({
                            name: v.name,
                            value: v.text,
                            from: imp.request,
                            node: v.node,
                        })
                    );
                } catch (e) {
                    /**/
                }
            });

            importVars.forEach((v) => {
                if (
                    v.name.startsWith(inner) &&
                    meta
                        .getImportStatements()
                        .some((imp) => Object.keys(imp.named).some((key) => key === v.name))
                ) {
                    const value = stylable.transformDecl(meta, `unknown`, v.value).value;
                    comps.push(
                        valueCompletion(
                            v.name,
                            v.from,
                            value,
                            new ProviderRange(
                                new ProviderPosition(
                                    position.line,
                                    position.character - inner.length
                                ),
                                position
                            )
                        )
                    );
                }
            });
            return comps;
        } else {
            return [];
        }
    },
};

function collectStates(lastNode: ResolvedElement) {
    return lastNode.resolved.reduce<MappedStates>((acc, cur) => {
        const symbol = cur.symbol;
        if (symbol._kind === 'class') {
            const symbolStates = symbol[`-st-states`];

            if (symbolStates) {
                Object.keys(symbolStates).forEach((k) => {
                    const symbolStates = symbol[`-st-states`];
                    if (symbolStates && symbolStates[k] !== undefined) {
                        acc[k] = symbolStates[k];
                    }
                });
            }
        }
        return acc;
    }, {});
}

function isBetweenChars(text: string, position: ProviderPosition, char1: string, char2: string) {
    const posChar = position.character;
    const textToPosition = text.slice(0, posChar);
    const textfromPosition = text.slice(posChar);
    const openingParenthesisIndex = textToPosition.lastIndexOf(char1);
    const closingParenthesisIndex = textfromPosition.indexOf(char2) + posChar;

    return posChar > openingParenthesisIndex && posChar <= closingParenthesisIndex;
}

function getStateDefinitionInput(fullLineText: string, position: ProviderPosition) {
    let input = fullLineText.slice(0, position.character);
    const lastParenthesis = input.lastIndexOf('(');
    input = input.slice(lastParenthesis + 1);
    return input;
}

function createCodeMixinCompletion(
    name: string,
    lastName: string,
    position: ProviderPosition,
    meta: StylableMeta
) {
    const importSymbol = meta.getSymbol(name);
    if (!importSymbol || importSymbol._kind !== 'import') {
        throw new Error('expected import symbol');
    }

    return codeMixinCompletion(
        name,
        new ProviderRange(
            new ProviderPosition(position.line, position.character - lastName.length),
            position
        ),
        importSymbol.import.request
    );
}

function isMixin(
    name: string,
    meta: StylableMeta,
    fs: IFileSystem,
    tsLangService: ExtendedTsLanguageService
) {
    const importSymbol = meta.getSymbol(name)!;

    if (importSymbol._kind === 'import') {
        if (importSymbol.import.request.endsWith('.ts')) {
            const sig = extractTsSignature(
                importSymbol.import.from,
                name,
                importSymbol.type === 'default',
                tsLangService
            );
            if (!sig || !sig.declaration) {
                return false;
            }
            const rtype = sig.declaration.type
                ? (sig.declaration.type as ts.TypeReferenceNode).getText()
                : '';
            return /(\w+.)?object/.test(rtype.trim());
        }
        if (importSymbol.import.request.endsWith('.js')) {
            return (
                extractJsModifierReturnType(
                    name,
                    fs.readFileSync(importSymbol.import.from, 'utf8')
                ) === 'object'
            );
        }
    }

    return false;
}
