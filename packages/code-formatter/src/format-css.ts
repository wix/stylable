import { parse, AnyNode, Rule, Declaration } from 'postcss';
import {
    parseCSSValue,
    stringifyCSSValue,
    type BaseAstNode,
    space,
    Call,
} from '@tokey/css-value-parser';
import type * as ValueParser from '@tokey/css-value-parser';

// TODO: handle case where "raws" contains comments or newlines - done for decls, done  for rules
// TODO: handle case where internal selector has newline (not the separation ,\n)

// ToDo: implement in tokey/css-value-parser
function walkValue(
    ast: BaseAstNode | BaseAstNode[],
    visit: (node: BaseAstNode, parents: BaseAstNode[], siblings: BaseAstNode[]) => void,
    options: { insideOut?: boolean } = {},
    parents: BaseAstNode[] = []
) {
    ast = Array.isArray(ast) ? ast : [ast];
    const insideOut = !!options.insideOut;
    for (const node of [...ast]) {
        !insideOut && visit(node, parents, ast);
        if (node.type === 'call') {
            walkValue(node.args, visit, options, [...parents, node]);
        }
        insideOut && visit(node, parents, ast);
    }
}

export interface FormatOptions {
    endOfLine: string;
    indent: string;
    indentLevel: number;
    linesBetween: number;
    endWithNewline: boolean;
    wrapLineLength: number;
}

export function formatCSS(css: string, options: Partial<FormatOptions> = {}) {
    const endOfLine = options.endOfLine ?? getLineEnding(css);
    css = css.replace(/\r?\n|\r/g, endOfLine);
    const ast = parse(css);
    const indent = options.indent ?? ' '.repeat(4);
    const indentLevel = options.indentLevel ?? 0;
    const linesBetween = options.linesBetween ?? 1;
    const endWithNewline = options.endWithNewline ?? true;
    const wrapLineLength = options.wrapLineLength || 80;
    for (let i = 0; i < ast.nodes.length; i++) {
        formatAst(ast.nodes[i], i, {
            endOfLine,
            indent,
            indentLevel,
            linesBetween,
            endWithNewline,
            wrapLineLength,
        });
    }
    const outputCSS = ast.toString();
    if (endWithNewline) {
        return outputCSS.endsWith(endOfLine) || outputCSS.length === 0
            ? outputCSS
            : outputCSS + endOfLine;
    } else {
        return outputCSS.replace(/\r?\n\s*$/, '');
    }
}

function formatAst(ast: AnyNode, index: number, options: FormatOptions) {
    const {
        endOfLine: NL,
        indent,
        indentLevel,
        linesBetween,
        endWithNewline,
        wrapLineLength,
    } = options;
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
                newBetween +=
                    betweenNode.preComments.join(``) +
                    ':' +
                    afterComments +
                    betweenNode.postSpace.replace(/\s+/gu, ' ');
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
            const endSpace = value.match(/[\s\S]?\s+$/m) ? ' ' : '';
            const hasStartSpaceInBetween = newBetween.match(/[\s\S]?\s+$/m) ? true : false;
            let cleaned = hasStartSpaceInBetween
                ? cleanValue(value).trimStart()
                : cleanValue(value);
            cleaned = endSpace ? cleaned.trimEnd() : cleaned;
            ast.value = cleaned + endSpace;
        } else {
            const valueAst = parseCSSValue(value);
            const preserveComponentNewLines =
                hasNewLineBeforeValue || isDeclComponentPreservedNewLines(ast);
            // get minimal base indent
            const baseIndentSize = hasNewLineBeforeValue
                ? indent.repeat(indentLevel + 1).length
                : ast.raws.before.length -
                  1 /* -1 NL */ +
                  ast.prop.length +
                  ast.raws.between.length;
            // collect node lengths & minimize spaces
            const nodesInfo = new Map<BaseAstNode, { length: number; breakFuncArgs: boolean }>();
            const baseIndent = ' '.repeat(baseIndentSize);
            walkValue(
                valueAst,
                normalizeDeclValueAndCollectLength(preserveComponentNewLines, NL, nodesInfo),
                { insideOut: true }
            );
            // format each top level segment
            flowDeclValueSegment({
                nodes: valueAst,
                maxLength: wrapLineLength,
                nodesInfo,
                singleIndent: indent,
                baseIndentSize,
                NL,
                breakOnComma: false,
            });

            // update formatted value
            const beforeValueIndent = hasNewLineBeforeValue ? baseIndent : '';
            ast.value = beforeValueIndent + stringifyCSSValue(valueAst);
            //
            if (ast.raws.value /* The postcss type does not represent the reality */) {
                delete (ast.raws as any).value;
            }
        }
        // trim whitespace before final semicolon
        if (ast.value) {
            ast.value = ast.value.trimEnd();
            ast.value ||= ' '; // minimal space
        }
    } else if (ast.type === 'atrule') {
        const prevType = ast.prev()?.type;
        const hasCommentBefore = prevType === 'comment';
        const hasRuleBefore = prevType === 'rule';

        /* The postcss type does not represent the reality there are atRules without nodes */
        const childrenLen = ast.nodes?.length ?? -1;
        const separation =
            (childrenLen === -1 && !hasRuleBefore) || hasCommentBefore ? 0 : linesBetween;

        ast.raws.before =
            index !== 0 || indentLevel > 0
                ? NL.repeat(index !== 0 ? separation + 1 : 1) + indent.repeat(indentLevel)
                : '';
        ast.raws.after = childrenLen ? NL + indent.repeat(indentLevel) : '';
        ast.raws.afterName = ast.params.length
            ? enforceOneSpaceAround(ast.raws.afterName || '')
            : '';
        const newBetween = enforceOneSpaceAround(ast.raws.between || '');
        ast.raws.between = childrenLen === -1 ? newBetween.trimEnd() : newBetween;

        ast.params = new AtRuleParamFormatter(options).format(ast.params);
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
                endOfLine: NL,
                indent,
                indentLevel: indentLevel + 1,
                linesBetween,
                endWithNewline,
                wrapLineLength,
            });
        }
    }
}

type BlockStack =
    | { type: ')' | ']'; isNewline: boolean }
    | { type: 'func-end'; isNewline: boolean; node: ValueParser.Call };
type OpenBrackets = '(' | '[';
const blockCloserMap = { '(': ')', '[': ']' } as const;
interface NodeContext {
    index: number;
    siblings: ValueParser.BaseAstNode[];
    parents: ValueParser.BaseAstNode[];
    nextNode: ValueParser.BaseAstNode;
    prevNode: ValueParser.BaseAstNode;
    currentBlock: BlockStack;
}
class AtRuleParamFormatter {
    private blockCloserStack!: BlockStack[];
    private currentNewlineIndent!: string;
    constructor(private options: FormatOptions) {}
    /**
     * Iterate DFS over params value AST nodes:
     *  - normalize spaces with preserved newline as value
     *  - track stack of "function/block" structure with "newline-indent" flag for each
     *  - trim spaces around "function/block" content
     *  - set spaces around commas and for "function/block" open/close nodes
     *    according to "newline-indent" of current stack state
     */
    public format(params: string): string {
        const paramsAst = parseCSSValue(params);
        this.blockCloserStack = [];
        this.currentNewlineIndent = '';

        walkValue(paramsAst, (node, parents, siblings) => {
            const context = this.getContext(node, parents, siblings);
            if (node.type === 'literal') {
                if (node.value === ',') {
                    this.formatAroundComma(node, context, this.options);
                } else if (node.value === '(' || node.value === '[') {
                    this.formatBlockOpen(node, context, this.options);
                } else if (node.value === ')' || node.value === ']') {
                    this.formatBlockClose(node, context, this.options);
                }
            } else if (node.type === 'space') {
                this.formatWhitespace(node);
            } else if (node.type === 'call') {
                this.formatFunction(node, this.options);
            }
        });
        return stringifyCSSValue(paramsAst);
    }

    private getContext(
        node: ValueParser.BaseAstNode,
        parents: NodeContext['parents'],
        siblings: NodeContext['parents']
    ): NodeContext {
        const index = siblings.indexOf(node);
        const prevNode = siblings[index - 1];
        const nextNode = siblings[index + 1];
        return {
            index,
            siblings,
            parents,
            nextNode,
            prevNode,
            currentBlock: this.getCurrentStackBlock(parents),
        };
    }
    private formatWhitespace(node: ValueParser.Space) {
        node.before = node.after = '';
        if (node.value && !node.value.includes('\n')) {
            node.value = ' ';
        }
    }
    private formatAroundComma(
        _node: ValueParser.Literal,
        context: NodeContext,
        options: FormatOptions
    ) {
        const { prevNode, nextNode } = context;
        // argument delimiter
        if (prevNode?.type === 'space') {
            prevNode.value = '';
        }
        // set next inline/newline space
        this.setNewlineOrInline(
            {
                spaceNode: nextNode,
                placeBefore: false,
                inlineSpace: ' ',
            },
            context,
            options
        );
    }
    private formatBlockOpen(
        node: ValueParser.Literal,
        { nextNode }: NodeContext,
        { endOfLine: NL }: FormatOptions
    ) {
        const isSpaceAfter = nextNode?.type === 'space';
        const isNewline = isSpaceAfter && stringifyCSSValue(nextNode).includes('\n');
        if (isSpaceAfter) {
            if (isNewline) {
                this.increaseIndent();
            }
            nextNode.value = isNewline ? NL + this.currentNewlineIndent : '';
        }
        this.addToBlockStack(node, isNewline);
    }
    private formatBlockClose(
        node: ValueParser.Literal,
        context: NodeContext,
        options: FormatOptions
    ) {
        const { prevNode, currentBlock } = context;
        if (currentBlock.type === node.value) {
            this.blockCloserStack.pop();
            if (currentBlock.isNewline) {
                this.currentNewlineIndent = this.currentNewlineIndent.slice(
                    0,
                    this.currentNewlineIndent.length - options.indent.length
                );
            }
        }
        this.setNewlineOrInline(
            {
                spaceNode: prevNode,
                placeBefore: true,
                inlineSpace: '',
            },
            context,
            options
        );
    }
    private formatFunction(node: ValueParser.Call, { endOfLine: NL }: FormatOptions) {
        const isNewline = node.before.includes('\n');
        this.addToBlockStack(node, isNewline);
        if (isNewline) {
            node.after = NL + this.currentNewlineIndent;
            this.increaseIndent();
            node.before = NL + this.currentNewlineIndent;
        } else {
            node.before = node.after = '';
        }
    }
    private increaseIndent() {
        this.currentNewlineIndent += this.options.indent;
    }
    private setNewlineOrInline(
        {
            spaceNode,
            placeBefore,
            inlineSpace,
        }: {
            spaceNode: ValueParser.BaseAstNode;
            placeBefore: boolean;
            inlineSpace: string;
        },
        { currentBlock, siblings, index }: NodeContext,
        { endOfLine: NL }: FormatOptions
    ) {
        const spaceValue = currentBlock?.isNewline ? NL + this.currentNewlineIndent : inlineSpace;
        if (spaceNode?.type === 'space') {
            spaceNode.value = spaceValue;
        } else if (spaceValue) {
            siblings.splice(index + (placeBefore ? 0 : 1), 0, space({ value: spaceValue }));
        }
    }
    private addToBlockStack(node: ValueParser.BaseAstNode, isNewline: boolean) {
        if (node.type === 'call') {
            this.blockCloserStack.push({ type: 'func-end', isNewline, node });
        } else if (node.value in blockCloserMap) {
            this.blockCloserStack.push({
                type: blockCloserMap[node.value as OpenBrackets],
                isNewline,
            });
        }
    }
    private getCurrentStackBlock(parents: BaseAstNode[]) {
        let currentBlock = this.blockCloserStack[this.blockCloserStack.length - 1];
        // pop closed function from indent stack
        while (currentBlock?.type === 'func-end' && !parents.includes(currentBlock.node)) {
            this.blockCloserStack.pop();
            if (currentBlock.isNewline) {
                this.currentNewlineIndent = this.currentNewlineIndent.slice(
                    0,
                    this.currentNewlineIndent.length - this.options.indent.length
                );
            }
            currentBlock = this.blockCloserStack[this.blockCloserStack.length - 1];
        }
        return currentBlock;
    }
}

function normalizeDeclValueAndCollectLength(
    preserveTopLevelNewLines: boolean,
    NL: string,
    nodesInfo: Map<ValueParser.BaseAstNode, { length: number; breakFuncArgs: boolean }>
): (
    node: ValueParser.BaseAstNode,
    parents: ValueParser.BaseAstNode[],
    siblings: ValueParser.BaseAstNode[]
) => void {
    return (node, parents, siblings) => {
        const preserveNewLines = !parents.length
            ? preserveTopLevelNewLines
            : nodesInfo.get(parents[parents.length - 1])?.breakFuncArgs;
        if (node.type === 'space') {
            const isNewLine =
                preserveNewLines &&
                (node.value.includes('\n') ||
                    node.before.includes('\n') ||
                    node.after.includes('\n'));
            node.value = isNewLine ? NL : ' ';
            node.before = node.after = '';
        }
        let breakFuncArgs = false;
        if (node.type === 'call') {
            breakFuncArgs = node.before.includes('\n');
            node.after = node.before = '';
        }
        if (node.type === 'literal' && node.value === ',') {
            // add space after , if not existing
            const index = siblings.indexOf(node);
            const prevNode = siblings[index - 1];
            const nextNode = siblings[index + 1];
            // ensure space after
            if (nextNode?.type !== 'space') {
                siblings.splice(index + 1, 0, space({ value: ' ' }));
            }
            // remove space before
            if (prevNode?.type === 'space') {
                siblings.splice(index - 1, 1);
            }
        }
        nodesInfo.set(node, { length: stringifyCSSValue(node).length, breakFuncArgs });
    };
}

function isDeclComponentPreservedNewLines({ prop }: Declaration) {
    return prop === 'grid-template-areas' || prop === 'grid-template';
}

function flowDeclValueSegment({
    nodes,
    maxLength,
    nodesInfo,
    singleIndent,
    baseIndentSize,
    NL,
    breakOnComma,
}: {
    nodes: BaseAstNode[];
    maxLength: number;
    nodesInfo: Map<BaseAstNode, { length: number; breakFuncArgs: boolean }>;
    singleIndent: string;
    baseIndentSize: number;
    NL: string;
    breakOnComma: boolean;
}) {
    const baseIndent = ' '.repeat(baseIndentSize);
    let currentColumn = baseIndentSize;
    let prevNode: BaseAstNode | undefined;
    const originalNodes = [...nodes];
    let lastInlineComma: { node: BaseAstNode; column: number } | undefined;
    let currentNodeIndex = -1;
    for (let index = 0; index <= originalNodes.length - 1; ++index) {
        currentNodeIndex++;
        let node = originalNodes[index];
        const nodeInfo = nodesInfo.get(node) || { length: 0, breakFuncArgs: false };
        let isOverflow = nodeInfo.length + currentColumn > maxLength;
        const isFunction = node.type === 'call';
        const breakableFunction = isFunction && isFunctionBreakable(node as Call, nodesInfo);
        const preferFunctionBreak = breakableFunction && nodeInfo.breakFuncArgs;
        const isComma = node.type === 'literal' && node.value === ',';
        const firstInLine = currentColumn === baseIndentSize;
        // force break after comma
        if (breakOnComma && isComma) {
            // assume normalize always adds space after comma
            node = originalNodes[index + 1];
            isOverflow = true;
        }
        // lookback to see if break can be done on comma
        if (isOverflow && lastInlineComma) {
            // replace space after inline comma with newline and indent
            const commaIndex = nodes.indexOf(lastInlineComma.node);
            const spaceAfterComma = nodes[commaIndex + 1];
            spaceAfterComma.value = NL + baseIndent;
            // reset state to continue with content dropped line and redo last node
            currentColumn = currentColumn - lastInlineComma.column + baseIndentSize;
            lastInlineComma = undefined;
            index--;
            currentNodeIndex--;
            continue;
        }
        // wrap value parts according to available space
        if (node.type === 'space' && node.value.includes('\n')) {
            node.value = NL + baseIndent;
            currentColumn = baseIndentSize;
            lastInlineComma = undefined;
        } else if (
            !preferFunctionBreak &&
            (!isOverflow ||
                (firstInLine && (!isFunction || !breakableFunction)) ||
                (!breakOnComma && isComma))
        ) {
            // add to current line
            currentColumn += nodeInfo.length;
            if (isComma) {
                lastInlineComma = { node, column: currentColumn };
            }
        } else if (node.type === 'call' && breakableFunction) {
            // split args to lines
            splitAndIndentDeclFuncArgs({
                funcNode: node,
                maxLength,
                nodesInfo,
                singleIndent,
                baseIndentSize,
                NL,
            });
            // set position to base + closing paren
            currentColumn = baseIndentSize + 1;
            lastInlineComma = undefined;
        } else {
            // break and indent
            currentColumn = baseIndentSize;
            lastInlineComma = undefined;
            if (node.type === 'space') {
                // mutate space to be newline and indent
                node.value = NL + baseIndent;
            } else {
                currentColumn += nodeInfo.length;
                if (prevNode?.type === 'space') {
                    // change prev space to be newline and indent
                    prevNode.value = NL + baseIndent;
                } else {
                    // add newline and indent before node
                    nodes.splice(currentNodeIndex, 0, space({ value: NL + baseIndent }));
                    currentNodeIndex++;
                }
            }
        }
        prevNode = node;
    }
}
function isFunctionBreakable(
    funcNode: Call,
    nodesInfo: Map<BaseAstNode, { length: number; breakFuncArgs: boolean }>
) {
    const totalSize = nodesInfo.get(funcNode)!.length;
    if (totalSize <= 30) {
        return false;
    }
    let contentFragAmount = 0;
    for (const node of funcNode.args) {
        if (node.type === 'call') {
            // always allow to break function with inner function arg
            return true;
        } else if (node.type !== 'space') {
            contentFragAmount++;
        }
    }
    return contentFragAmount > 1;
}
function splitAndIndentDeclFuncArgs({
    funcNode,
    maxLength,
    nodesInfo,
    singleIndent,
    baseIndentSize,
    NL,
}: {
    funcNode: Call;
    maxLength: number;
    nodesInfo: Map<BaseAstNode, { length: number; breakFuncArgs: boolean }>;
    singleIndent: string;
    baseIndentSize: number;
    NL: string;
}) {
    const funcIndent = ' '.repeat(baseIndentSize);
    const argsIndent = funcIndent + singleIndent;
    // add initial line break for first argument
    if (funcNode.args[0].type !== 'space') {
        funcNode.before = NL + argsIndent;
    }
    flowDeclValueSegment({
        nodes: funcNode.args,
        maxLength,
        nodesInfo,
        singleIndent,
        baseIndentSize: argsIndent.length,
        NL,
        breakOnComma: true,
    });
    // remove any last space and indent closing paren
    if (funcNode.args.length) {
        const closingNewLineIndent = NL + funcIndent;
        const lastArgNode = funcNode.args[funcNode.args.length - 1];
        if (lastArgNode.type === 'space') {
            funcNode.args.pop();
        }
        funcNode.after = closingNewLineIndent;
    }
}

function enforceOneSpaceAround(value: string) {
    let newBetween = cleanValue(value, true);
    const startWithSpace = newBetween.startsWith(' ');
    if (!startWithSpace) {
        newBetween = ' ' + newBetween;
    }
    const endWithSpace = newBetween.endsWith(' ');
    if (!endWithSpace) {
        newBetween = newBetween + ' ';
    }
    return newBetween;
}

function cleanValue(value: string, forceSpaceInSpaceNode = false) {
    return stringifyCSSValue(cleanValueAst(parseCSSValue(value), forceSpaceInSpaceNode));
}

function cleanValueAst(ast: ReturnType<typeof parseCSSValue>, forceSpaceInSpaceNode = false) {
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

function formatSelectors(
    rule: Rule,
    forceNL: boolean,
    { endOfLine: NL, indent, indentLevel }: FormatOptions
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
