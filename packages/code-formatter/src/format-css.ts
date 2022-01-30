import { parse, AnyNode, Rule } from 'postcss';
import { parseCSSValue, stringifyCSSValue } from '@tokey/css-value-parser';
import type { ParseResults } from '@tokey/css-value-parser/dist/value-parser';

// TODO: handle case where "raws" contains comments or newlines - done for decls, done  for rules
// TODO: handle case where internal selector has newline (not the separation ,\n)

export interface FormatOptions {
    lineEndings: string;
    indent: string;
    indentLevel: number;
    linesBetween: number;
}

export function formatCSS(css: string, options: Partial<FormatOptions> = {}) {
    const ast = parse(css);
    const lineEndings = options.lineEndings ?? getLineEnding(css);
    const indent = options.indent ?? '    ';
    const indentLevel = options.indentLevel ?? 0;
    const linesBetween = options.linesBetween ?? 1;
    for (let i = 0; i < ast.nodes.length; i++) {
        formatAst(ast.nodes[i], i, { lineEndings, indent, indentLevel, linesBetween });
    }
    const outputCSS = ast.toString();
    return outputCSS.endsWith('\n') || outputCSS.length === 0 ? outputCSS : outputCSS + lineEndings;
}

function formatAst(ast: AnyNode, index: number, options: FormatOptions) {
    const { lineEndings: NL, indent, indentLevel, linesBetween } = options;
    if (ast.type === 'rule') {
        const hasCommentBefore = ast.prev()?.type === 'comment';
        const childrenLen = ast.nodes.length;
        const isFirstChildInNested = index === 0 && indentLevel > 0;
        const separation = isFirstChildInNested || hasCommentBefore ? 0 : linesBetween;
        ast.raws.before =
            index !== 0 || indentLevel > 0
                ? NL.repeat(separation + 1) + indent.repeat(indentLevel)
                : '';
        ast.raws.after = childrenLen ? NL + indent.repeat(indentLevel) : '';
        if (ast.raws.between) {
            ast.raws.between = enforceOneSpaceAround(ast.raws.between);
        } else {
            ast.raws.between = ' ';
        }
        ast.raws.semicolon = childrenLen ? true : false;
        const hasNewLine = ast.selector.includes('\n' /* don't use NL */);
        ast.selector = formatSelectors(ast, hasNewLine, options);
    } else if (ast.type === 'decl') {
        ast.raws.before = NL + indent.repeat(indentLevel);
        const value = ast.raws.value?.raw ?? ast.value;
        const valueHasNewline = value.includes('\n' /* don't use NL */);
        let hasNewLineBeforeValue = false;
        let newBetween = '';
        if (ast.raws.between) {
            const betweenNode = parseDeclBetweenRaws(ast.raws.between);
            const afterComments = betweenNode.postComments.join(``);
            if (ast.variable) {
                // TODO: change approach parse the thing remove spaces and stringify
                newBetween +=
                    betweenNode.preComments.join(``) +
                    ':' +
                    afterComments +
                    betweenNode.postSpace.replace(/\s+/gu, ' ');
                // newBetween += ast.raws.between.trimStart().replace(/\s+/gu, ' ');
            } else if (betweenNode.postSpace.includes('\n' /* don't use NL */) && valueHasNewline) {
                newBetween += betweenNode.preComments.join(``);
                hasNewLineBeforeValue = true;
                newBetween += ':' + afterComments + NL;
            } else {
                newBetween += betweenNode.preComments.join(``);
                newBetween += ': ' + afterComments;
            }
        }

        ast.raws.between = newBetween;
        if (ast.variable) {
            // TODO: change approach parse the thing remove spaces and stringify
            const endSpace = value.match(/[\s\S]?\s+$/m) ? ' ' : '';
            const hasStartSpaceInBetween = newBetween.match(/[\s\S]?\s+$/m) ? true : false;
            let cleaned = hasStartSpaceInBetween
                ? cleanValue(ast.value).trimStart()
                : cleanValue(ast.value);
            cleaned = endSpace ? cleaned.trimEnd() : cleaned;
            ast.value = cleaned + endSpace;
        } else {
            const valueGroups = groupMultipleValuesSeparatedByComma(parseCSSValue(value));

            const warpLineIndentSize = hasNewLineBeforeValue
                ? indent.repeat(indentLevel + 1).length
                : ast.raws.before.length -
                  1 /* -1 NL */ +
                  ast.prop.length +
                  ast.raws.between.length;

            const values = valueGroups.map((valueAst) => stringifyCSSValue(valueAst).trim());
            const groups = groupBySize(
                values,
                valueHasNewline ? ',' + NL /* only NL needed indentation taken care after */ : ', '
            );

            ast.value = groups
                .map((groupedValue) => {
                    return groupedValue
                        .split(/\r?\n/gm)
                        .map((part, i) => {
                            if (!hasNewLineBeforeValue && i === 0) {
                                return part.trim();
                            }
                            return ' '.repeat(warpLineIndentSize) + part.trim();
                        })
                        .join(NL);
                })
                .join(',' + NL + ' '.repeat(warpLineIndentSize));
            if (ast.raws.value /* The postcss type does not represent the reality */) {
                delete (ast.raws as any).value;
            }
        }
    } else if (ast.type === 'atrule') {
        // TODO: handle params
        const prevType = ast.prev()?.type;
        const hasCommentBefore = prevType === 'comment';
        const hasRuleBefore = prevType === 'rule';

        /* The postcss type does not represent the reality there are atRules without nodes */
        const childrenLen = ast.nodes?.length ?? -1;
        const separation =
            (childrenLen === -1 && !hasRuleBefore) || hasCommentBefore ? 0 : linesBetween;

        ast.raws.before =
            index !== 0 || indentLevel > 0
                ? NL.repeat(separation + 1) + indent.repeat(indentLevel)
                : '';
        ast.raws.after = childrenLen ? NL + indent.repeat(indentLevel) : '';
        ast.raws.afterName = ast.params.length
            ? enforceOneSpaceAround(ast.raws.afterName || '')
            : '';
        const newBetween = enforceOneSpaceAround(ast.raws.between || '');
        ast.raws.between = childrenLen === -1 ? newBetween.trimEnd() : newBetween;
    } else if (ast.type === 'comment') {
        if (ast.prev()?.type !== 'decl' && ast.prev()?.type !== 'comment') {
            const isFirstChildInNested = index === 0 && indentLevel > 0;
            const separation = isFirstChildInNested ? 0 : linesBetween;
            ast.raws.before =
                index !== 0 || indentLevel > 0
                    ? NL.repeat(separation + 1) + indent.repeat(indentLevel)
                    : '';
        } else {
            // TODO - what else todo?
        }
    }
    if ('nodes' in ast) {
        for (let i = 0; i < ast.nodes.length; i++) {
            formatAst(ast.nodes[i], i, {
                lineEndings: NL,
                indent,
                indentLevel: indentLevel + 1,
                linesBetween,
            });
        }
    }
}

function enforceOneSpaceAround(value: string) {
    let newBetween = cleanValue(value, true);
    const startWithSpace = newBetween.startsWith(' ');
    const endWithSpace = newBetween.endsWith(' ');
    if (!startWithSpace) {
        newBetween = ' ' + newBetween;
    }
    if (!endWithSpace) {
        newBetween = newBetween + ' ';
    }
    return newBetween;
}

function cleanValue(value: string, forceSpaceInSpaceNode = false) {
    return stringifyCSSValue(cleanValueAst(parseCSSValue(value), forceSpaceInSpaceNode));
}

function cleanValueAst(ast: ParseResults, forceSpaceInSpaceNode = false) {
    for (const node of ast) {
        if ('before' in node) {
            node.before = node.before.replace(/[\s\S]+/gu, ' ');
        }
        if ('after' in node) {
            node.after = node.after.replace(/[\s\S]+/gu, ' ');
        }
        if (node.type === 'space') {
            node.before = '';
            node.after = '';
            if (forceSpaceInSpaceNode) {
                node.value = ' ';
            }
        } else if (node.type === 'call') {
            cleanValueAst(node.args);
        }
    }
    return ast;
}

function parseDeclBetweenRaws(between: string) {
    const beforeAst = parseCSSValue(between);
    const beforeNode = {
        preSpace: '',
        preComments: [] as string[],
        postSpace: '',
        postComments: [] as string[],
        colon: false,
    };
    for (const node of beforeAst) {
        if (node.type === 'space') {
            if (beforeNode.colon) {
                beforeNode.postSpace += stringifyCSSValue(node);
            } else {
                beforeNode.preSpace += stringifyCSSValue(node);
            }
        } else if (node.type === 'comment') {
            if (beforeNode.colon) {
                beforeNode.postComments.push(node.value);
            } else {
                beforeNode.preComments.push(node.value);
            }
        } else if (node.type === 'literal' && node.value === ':') {
            beforeNode.colon = true;
        }
    }
    return beforeNode;
}

function groupMultipleValuesSeparatedByComma(ast: ReturnType<typeof parseCSSValue>) {
    const groups = [];
    let currentGroup = [];
    for (const node of ast) {
        if (node.type === 'literal' && node.value === ',') {
            groups.push(currentGroup);
            currentGroup = [];
        } else {
            currentGroup.push(node);
        }
    }
    if (currentGroup.length) {
        groups.push(currentGroup);
    }
    return groups;
}

function formatSelectors(
    rule: Rule,
    forceNL: boolean,
    { lineEndings: NL, indent, indentLevel }: FormatOptions
) {
    const selectors = rule.selectors;
    const newlines = rule.selector.match(/\n/gm)?.length ?? 0;
    selectors.sort((a, b) => a.length - b.length);
    const groups = groupBySize(selectors);
    const selectorsToFormatted = forceNL
        ? groups.length === newlines + 1
            ? groups
            : selectors
        : groups;
    return selectorsToFormatted.join(`,${NL}${indent.repeat(indentLevel)}`);
}

function groupBySize(parts: string[], joinWith = ', ') {
    const maxLength = 50;
    const grouped = [];
    let currentGroup = [];
    let currentGroupLength = 0;
    for (const part of parts) {
        currentGroup.push(part);
        currentGroupLength += part.length;
        if (currentGroupLength >= maxLength) {
            grouped.push(currentGroup);
            currentGroup = [];
            currentGroupLength = 0;
        }
    }
    if (currentGroup.length) {
        grouped.push(currentGroup);
    }
    const formatted = [];
    for (const group of grouped) {
        formatted.push(group.join(joinWith));
    }
    return formatted;
}

function getLineEnding(css: string) {
    // naive implementation
    for (const ch of css) {
        if (ch === '\r') {
            return '\r\n';
        }
        if (ch === '\n') {
            return '\n';
        }
    }
    return '\n';
}
