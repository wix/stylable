import {
    Seeker,
    tokenize,
    isComment,
    isStringDelimiter,
    isWhitespace,
    createToken,
    getJSCommentStartType,
    isCommentEnd,
    getUnclosedComment,
    Token,
    Descriptors,
} from '@tokey/core';
import { Diagnostics, createDiagnosticReporter } from '../diagnostics';
import type * as postcss from 'postcss';

type Delimiters = ',' | ';' | ':' | '{' | '}' | '[' | ']' | '(' | ')' | '*';

export type CodeToken = Token<Descriptors | Delimiters>;

export interface AnalyzedExports {
    stExports: ExportMapping;
    jsExports: ExportMapping;
}

export interface ExportMapping {
    publicToPrivate: {
        named: Record<string, string>;
        typed: Record<string, Record<string, string>>;
    };
    privateToPublic: {
        named: Record<string, string[]>;
        typed: Record<string, Record<string, string[]>>;
    };
}

export interface ParsedExport {
    to: string[] | undefined;
    named: NamedMapping[] | undefined;
    typed: Record<string, NamedMapping[] | undefined>;
    errors: string[];
}

export type NamedMapping = [from: string, to: string];

interface ExportTarget {
    css: boolean;
    js: boolean;
}

export const analyzeExportMessages = {
    UNKNOWN_EXPORT_TARGET: createDiagnosticReporter(
        '05100',
        'error',
        (target: string) => `unknown export target "${target}"`
    ),
    REPEATED_TARGET: createDiagnosticReporter(
        '05101',
        'warning',
        (target: string) => `export target "${target}" unnecessarily repeated`
    ),
    CONFLICTING_EXPORTS: createDiagnosticReporter(
        '05102',
        'error',
        (name: string, target: string, type?: string) => {
            const exportStr = type ? `${type}(${name})` : name;
            return `cannot export "${exportStr}" more then once (${target})`;
        }
    ),
    MULTIPLE_TO: createDiagnosticReporter(
        '05103',
        'error',
        () => `@st-export expects an optional single target definition to()`
    ),
    UNEXPECTED_TO_BLOCK_VALUE: createDiagnosticReporter(
        '05104',
        'error',
        (value: string) => `unexpected "${value}" found target of @st-export`
    ),
    UNCLOSED_TO: createDiagnosticReporter(
        '05105',
        'error',
        () => `unclosed "to() found in @st-export`
    ),
    MULTIPLE_NAMED_BLOCKS: createDiagnosticReporter(
        '05106',
        'error',
        () => `@st-export expects a single named mapping`
    ),
    UNCLOSED_NAMED_BLOCK: createDiagnosticReporter(
        '05107',
        'error',
        () => `unclosed named block found in @st-export`
    ),
    UNEXPECTED_VALUE: createDiagnosticReporter(
        '05108',
        'error',
        (value: string) => `unexpected value "${value}" found in @st-export`
    ),
    UNCLOSED_TYPED_BLOCK: createDiagnosticReporter(
        '05109',
        'error',
        (type: string) => `unclosed typed export "${type}"`
    ),
};

export function analyzeStExport(
    atRule: postcss.AtRule,
    registerTo: AnalyzedExports,
    diagnostics: Diagnostics
) {
    const parsed = parseExports(`${atRule.params}`, diagnostics, atRule);
    const target: ExportTarget = { js: true, css: true };
    if (parsed.to) {
        target.css = target.js = false;
        for (const targetName of parsed.to as (keyof ExportTarget)[]) {
            if (targetName in target === false) {
                diagnostics.report(analyzeExportMessages.UNKNOWN_EXPORT_TARGET(targetName), {
                    node: atRule,
                    word: targetName,
                });
            } else if (!target[targetName]) {
                target[targetName] = true;
            } else {
                diagnostics.report(analyzeExportMessages.REPEATED_TARGET(targetName), {
                    node: atRule,
                    word: targetName,
                });
            }
        }
    }
    if (parsed.named) {
        registerExports({
            named: parsed.named,
            registerTo,
            target,
            diagnostics,
            atRule,
        });
    }
    for (const [type, named] of Object.entries(parsed.typed)) {
        if (!named) {
            continue;
        }
        registerExports({
            named,
            registerTo,
            target,
            diagnostics,
            atRule,
            type,
        });
    }
}

export function registerExports({
    named,
    target,
    registerTo: { stExports, jsExports },
    type,
    diagnostics,
    atRule,
}: {
    named: NamedMapping[];
    target: ExportTarget;
    registerTo: AnalyzedExports;
    diagnostics: Diagnostics;
    atRule: postcss.AtRule;
    type?: string;
}) {
    let stPublicToPrivate = stExports.publicToPrivate.named;
    let jsPublicToPrivate = jsExports.publicToPrivate.named;
    let stPrivateToPrivate = stExports.privateToPublic.named;
    let jsPrivateToPrivate = jsExports.privateToPublic.named;
    if (type) {
        stPublicToPrivate = stExports.publicToPrivate.typed[type] ||= {};
        jsPublicToPrivate = jsExports.publicToPrivate.typed[type] ||= {};
        stPrivateToPrivate = stExports.privateToPublic.typed[type] ||= {};
        jsPrivateToPrivate = jsExports.privateToPublic.typed[type] ||= {};
    }
    for (const [localName, exportName] of named) {
        if (target.css) {
            if (stPublicToPrivate[exportName] !== undefined) {
                diagnostics.report(
                    analyzeExportMessages.CONFLICTING_EXPORTS(exportName, 'css', type),
                    { node: atRule }
                );
            }
            stPublicToPrivate[exportName] = localName;
            stPrivateToPrivate[localName] ??= [];
            stPrivateToPrivate[localName].push(exportName);
        }
        if (target.js) {
            if (jsPublicToPrivate[exportName] !== undefined) {
                diagnostics.report(
                    analyzeExportMessages.CONFLICTING_EXPORTS(exportName, 'js', type),
                    { node: atRule }
                );
            }
            jsPublicToPrivate[exportName] = localName;
            jsPrivateToPrivate[localName] ??= [];
            jsPrivateToPrivate[localName].push(exportName);
        }
    }
}

export function emptyAnalyzedExports(): AnalyzedExports {
    return {
        stExports: {
            publicToPrivate: { named: {}, typed: {} },
            privateToPublic: { named: {}, typed: {} },
        },
        jsExports: {
            publicToPrivate: { named: {}, typed: {} },
            privateToPublic: { named: {}, typed: {} },
        },
    };
}

function parseExports(source: string, diagnostics: Diagnostics, atRule: postcss.AtRule) {
    return findExports(
        tokenize<CodeToken>(source, {
            isDelimiter,
            isStringDelimiter,
            isWhitespace,
            shouldAddToken,
            createToken,
            getCommentStartType: getJSCommentStartType,
            isCommentEnd,
            getUnclosedComment,
        }),
        diagnostics,
        atRule
    );
}

const isDelimiter = (char: string) =>
    char === ';' ||
    char === '(' ||
    char === ')' ||
    char === ',' ||
    char === '{' ||
    char === '}' ||
    char === ':' ||
    char === '*' ||
    char === '[' ||
    char === ']';

const shouldAddToken = (type: CodeToken['type']) =>
    type === 'space' || isComment(type) ? false : true;

const isExportEnd = (token: CodeToken) => token.type === ';';

const blockStart = '[';
const blockEnd = ']';

function findExports(tokens: CodeToken[], diagnostics: Diagnostics, atRule: postcss.AtRule) {
    const s = new Seeker<CodeToken>(tokens);
    const parsed: ParsedExport = {
        to: undefined,
        named: undefined,
        typed: {},
        errors: [],
    };
    let t: CodeToken;
    while ((t = s.next())) {
        if (!t.type) {
            break;
        }
        if (t.type === 'text' && t.value === 'to' && s.peek(1).type === '(') {
            if (parsed.to) {
                diagnostics.report(analyzeExportMessages.MULTIPLE_TO(), { node: atRule });
                break;
            }
            const block = s.flatBlock('(', ')', isExportEnd);
            if (block) {
                parsed.to = processToBlock(block, diagnostics, atRule);
            } else {
                diagnostics.report(analyzeExportMessages.UNCLOSED_TO(), { node: atRule });
            }
        } else if (t.type === blockStart) {
            if (parsed.named) {
                diagnostics.report(analyzeExportMessages.MULTIPLE_NAMED_BLOCKS(), { node: atRule });
                break;
            }
            s.back();
            const block = s.flatBlock(blockStart, blockEnd, isExportEnd);
            if (block) {
                ({ named: parsed.named, typed: parsed.typed } = processNamedBlock(
                    block,
                    diagnostics,
                    atRule
                ));
            } else {
                diagnostics.report(analyzeExportMessages.UNCLOSED_NAMED_BLOCK(), { node: atRule });
            }
        } else if (t.type !== 'space' && t.type !== 'line-comment' && t.type !== 'multi-comment') {
            diagnostics.report(analyzeExportMessages.UNEXPECTED_VALUE(t.value), { node: atRule });
            break;
        }
    }
    return parsed;
}

function processToBlock(block: CodeToken[], diagnostics: Diagnostics, atRule: postcss.AtRule) {
    const to: string[] = [];
    let readyForIdent = true;

    for (let i = 0; i < block.length; i++) {
        const token = block[i];
        if (readyForIdent && token.type === 'text') {
            readyForIdent = false;
            to.push(token.value);
        } else if (!readyForIdent && token.type === ',') {
            readyForIdent = true;
        } else {
            diagnostics.report(analyzeExportMessages.UNEXPECTED_TO_BLOCK_VALUE(token.value), {
                node: atRule,
            });
        }
    }

    return to;
}

function processNamedBlock(
    block: CodeToken[],
    diagnostics: Diagnostics,
    atRule: postcss.AtRule,
    topLevel = true
) {
    const named: NamedMapping[] = [];
    const typed: Record<string, NamedMapping[]> = {};
    const tokens: CodeToken[] = [];

    for (let i = 0; i < block.length; i++) {
        const token = block[i];
        if (block[i + 1]?.type === '(' && topLevel) {
            const tagTokens = [];
            const tagName = block[i];
            let hasEnded;
            for (let j = i + 2; j < block.length; j++) {
                i = j;
                if (block[j].type === ')') {
                    hasEnded = true;
                    break;
                }
                tagTokens.push(block[j]);
            }
            typed[tagName.value] = processNamedBlock(tagTokens, diagnostics, atRule, false).named;
            if (!hasEnded) {
                diagnostics.report(analyzeExportMessages.UNCLOSED_TYPED_BLOCK(tagName.value), {
                    node: atRule,
                });
            }
        } else if (token.type === ',') {
            pushToken();
        } else {
            tokens.push(token);
        }
    }
    if (tokens.length) {
        pushToken();
    }

    return { named, typed };

    function pushToken() {
        if (tokens.length === 1) {
            const name = tokens[0].value;
            named.push([name, name]);
        } else if (tokens.length === 3) {
            if (tokens[1].value === 'as') {
                named.push([tokens[0].value, tokens[2].value]);
            }
        }
        tokens.length = 0;
    }
}
