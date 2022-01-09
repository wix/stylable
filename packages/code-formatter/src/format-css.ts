import { parse, AnyNode, Rule } from 'postcss';
import { parseCSSValue, stringifyCSSValue } from '@tokey/css-value-parser';

// TODO: handle case where declaration value starts or include newline - semi completed
// TODO: handle case where "raws" contains comments or newlines
// TODO: handle case where internal selector has newline (not the separation ,\n)
// TODO: handle case where rule before atRule with no children
// TODO: move css vars to top?

export function formatCSS(css: string) {
    const ast = parse(css);
    const NL = getLineEnding(css);
    const indent = '    ';
    const indentLevel = 0;
    for (let i = 0; i < ast.nodes.length; i++) {
        formatAst(ast.nodes[i], i, { NL, indent, indentLevel, linesBetween: 1 });
    }
    const outputCSS = ast.toString();
    return outputCSS.endsWith('\n') || outputCSS.length === 0 ? outputCSS : outputCSS + NL;
}

type FormatOptions = {
    NL: string;
    indent: string;
    indentLevel: number;
    linesBetween: number;
};

function formatAst(ast: AnyNode, index: number, options: FormatOptions) {
    const { NL, indent, indentLevel, linesBetween } = options;
    if (ast.type === 'atrule') {
        // TODO: handle params

        const hasCommentBefore = ast.prev()?.type === 'comment';

        /* The postcss type does not represent the reality there are atRules without nodes */
        const childrenLen = ast.nodes?.length ?? -1;
        const separation = childrenLen === -1 || hasCommentBefore ? 0 : linesBetween;

        ast.raws.before =
            index !== 0 || indentLevel > 0
                ? NL.repeat(separation + 1) + indent.repeat(indentLevel)
                : '';
        ast.raws.after = childrenLen ? NL + indent.repeat(indentLevel) : '';
        ast.raws.afterName = ast.params.length ? ' ' : '';
        ast.raws.between = childrenLen === -1 ? '' : ' ';
    } else if (ast.type === 'rule') {
        const hasCommentBefore = ast.prev()?.type === 'comment';
        const childrenLen = ast.nodes.length;
        const isFirstChildInNested = index === 0 && indentLevel > 0;
        const separation = isFirstChildInNested || hasCommentBefore ? 0 : linesBetween;
        ast.raws.before =
            index !== 0 || indentLevel > 0
                ? NL.repeat(separation + 1) + indent.repeat(indentLevel)
                : '';
        ast.raws.after = childrenLen ? NL + indent.repeat(indentLevel) : '';
        ast.raws.between = ' ';
        ast.raws.semicolon = childrenLen ? true : false;
        const hasNewLine = ast.selector.includes('\n' /* don't use NL */);
        ast.selector = formatSelectors(ast, hasNewLine, options);
    } else if (ast.type === 'decl') {
        ast.raws.before = NL + indent.repeat(indentLevel);
        if (ast.variable) {
            ast.raws.between =
                ast.raws.between?.trimStart() ||
                ':' /* no space here! css vars are space sensitive */;
        } else {
            const hasNewLineBeforeValue = ast.raws.between?.match(/:.*?\n.*?$/);

            ast.raws.between = hasNewLineBeforeValue ? ':\n' : ': ';
            const valueGroups = groupMultipleValuesSeparatedByComma(
                parseCSSValue(ast.raws.value?.raw ?? ast.value)
            );
            const warpLineIndentSize =
                ast.raws.before.length - 1 /* -1 NL */ + ast.prop.length + ast.raws.between.length;
            if (hasNewLineBeforeValue) {
                // TODO: check if we want to preserve original indentation
                ast.value = valueGroups
                    .map((valueAst) => {
                        return stringifyCSSValue(valueAst)
                            .trim()
                            .split(/\r?\n/gm)
                            .map((part) => {
                                return indent.repeat(indentLevel + 1) + part.trim();
                            })
                            .join(NL);
                    })
                    .join(',' + NL);
            } else {
                const values = valueGroups.map((valueAst) => stringifyCSSValue(valueAst).trim());
                ast.value = groupBySize(values).join(`,${NL}${' '.repeat(warpLineIndentSize)}`);
            }
            if (ast.raws.value /* The postcss type does not represent the reality */) {
                delete (ast.raws as any).value;
            }
        }
    } else if (ast.type === 'comment') {
        if (ast.prev()?.type !== 'decl' && ast.prev()?.type !== 'comment') {
            const isFirstChildInNested = index === 0 && indentLevel > 0;
            const separation = isFirstChildInNested ? 0 : linesBetween;
            ast.raws.before =
                index !== 0 || indentLevel > 0
                    ? NL.repeat(separation + 1) + indent.repeat(indentLevel)
                    : '';
        } else {
            // TODO
        }
    }
    if ('nodes' in ast) {
        for (let i = 0; i < ast.nodes.length; i++) {
            formatAst(ast.nodes[i], i, { NL, indent, indentLevel: indentLevel + 1, linesBetween });
        }
    }
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

function formatSelectors(rule: Rule, forceNL: boolean, { NL, indent, indentLevel }: FormatOptions) {
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
