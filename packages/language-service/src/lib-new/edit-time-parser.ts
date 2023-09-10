import { overrideNodeStringifier } from './stringifier';
import { Invalid } from './invalid-node';
import tokenizer from 'postcss/lib/tokenize';
import Parser from 'postcss/lib/parser';
import * as postcss from 'postcss';

// ToDo: model single char tokens
type PostcssToken = [string, string, number, number];

export type AnyNode =
    | Invalid
    | postcss.AnyNode
    | postcss.Container
    | postcss.Document
    | postcss.Declaration;

export interface ParseForEditingResult {
    ast: postcss.Root;
    errorNodes: Map<AnyNode, string[]>;
    ambiguousNodes: Map<AnyNode, string[]>;
}
export function parseForEditing(
    source: string,
    { from = '' }: { from?: string } = {}
): ParseForEditingResult {
    const input = new postcss.Input(source, { from }); // ToDo: check why stringifier option doesn't work
    const parser = new EditTimeParser(input);
    parser.parse();
    parser.closeAstSource();
    return {
        ast: parser.root,
        errorNodes: parser.errorNodes,
        ambiguousNodes: parser.ambiguousNodes,
    };
}

export type ParseReport = string;
export const ERRORS: Record<string, ParseReport> = {
    RULE_MISSING_OPEN: 'missing rule open {',
    MISSING_CLOSE: 'missing close }',
    UNCLOSED_BRACKETS: 'found unclosed brackets',
    DECL_MISSING_COLON: 'missing declaration colon',
    UNEXPECTED_CLOSE: 'unexpected close',
    ATRULE_MISSING_NAME: 'missing at-rule name',
};
export const AMBIGUITY: Record<string, ParseReport> = {
    POSSIBLE_UNOPENED_RULE: 'potential up-opened rule',
} as const;

class EditTimeParser extends Parser {
    public errorNodes: Map<AnyNode, string[]> = new Map();
    public ambiguousNodes: Map<AnyNode, string[]> = new Map();
    constructor(input: postcss.Input) {
        super(input);
        overrideNodeStringifier(this.current);
    }
    createTokenizer() {
        this.tokenizer = tokenizer(this.input, { ignoreErrors: true });
    }
    public closeAstSource(node: postcss.Node = this.root) {
        if (!node.source!.end) {
            const nodes = (node as any).nodes;
            // ToDo: add before/between/after values
            if (!nodes || nodes.length === 0) {
                const startPos = node.source!.start!;
                node.source!.end = {
                    offset: startPos.offset + node.source!.input.css.length,
                    line: startPos.line,
                    column: startPos.column,
                };
            } else {
                const lastNode = nodes[nodes.length - 1];
                this.closeAstSource(lastNode);
                const closePos = lastNode.source!.end!;
                node.source!.end = {
                    offset: closePos.offset + (node.raws.after?.length || 0),
                    line: closePos.line,
                    column: closePos.column,
                };
            }
        }
    }

    private reportNode(node: AnyNode, type: 'error' | 'ambiguity', report: string) {
        const bucket = type === 'error' ? this.errorNodes : this.ambiguousNodes;
        if (!bucket.has(node)) {
            bucket.set(node, []);
        }
        bucket.get(node)!.push(report);
    }

    private createInvalidNode(tokens: PostcssToken[], assumeTypes: string[]) {
        const node = new Invalid();
        assumeTypes.forEach((type) => node.assume.add(type));
        this.init(node, tokens[0][2]);
        this.raw(node, 'value', tokens, /* keep spaces*/ true);
        node.source!.end = this.getPosition(this.getLastOffset(tokens));
        node.source!.end.offset++;
        this.extendParentEnd(node);
        return node;
    }

    private getLastOffset(tokens: PostcssToken[]) {
        let collectedOffset = 0;
        for (let i = tokens.length - 1; i >= 0; --i) {
            const current = tokens[i];
            const offset = current[3] || current[2];
            if (offset !== undefined) {
                return offset + collectedOffset;
            } else {
                collectedOffset += current[1].length;
            }
        }
        return -1;
    }

    private extendParentEnd(node: AnyNode) {
        if (node.parent) {
            node.parent.source!.end = node.source!.end;
        }
    }

    private unOpenedRule(tokens: PostcssToken[]) {
        const node = this.createInvalidNode(tokens, ['rule']);
        this.reportNode(node, 'error', ERRORS.RULE_MISSING_OPEN);
        return node;
    }
    private unOpenedRuleOrDecl(tokens: PostcssToken[], hasColon: boolean) {
        const node = this.createInvalidNode(tokens, ['rule', 'decl']);
        this.reportNode(node, 'error', ERRORS.RULE_MISSING_OPEN);
        if (!hasColon) {
            this.reportNode(node, 'error', ERRORS.DECL_MISSING_COLON);
        }
        return node;
    }

    /* --- mods --- */

    init(node: postcss.Node, offset: number) {
        // override with custom stringifier
        overrideNodeStringifier(node);
        super.init(node, offset);
    }

    // unclosedBracket - override call in other()
    unknownWord() {
        // 1. overridden call in other()
        // 2. shouldn't happen: from decl with no prop
        // 3..... ToDo: describe cases
    }
    unexpectedClose(token: PostcssToken) {
        // keep unexpected in ast
        this.current.raws.after += token[1];
        this.reportNode(this.current, 'error', ERRORS.UNEXPECTED_CLOSE);
    }
    unclosedBlock() {
        // called on unexpected non top node on end-of-file
        let unclosedNode = this.current;
        while (unclosedNode.parent) {
            this.extendParentEnd(unclosedNode);
            unclosedNode = unclosedNode.parent;
        }
        this.reportNode(this.current, 'error', ERRORS.MISSING_CLOSE);
    }
    doubleColon() {
        // no error reported
    }
    unnamedAtrule(node: postcss.AtRule) {
        this.reportNode(node, 'error', ERRORS.ATRULE_MISSING_NAME);
    }
    checkMissedSemicolon() {
        // ignore colon in non custom property decl value
        // no error reported
    }

    other(start: PostcssToken) {
        let end = false;
        let type = null;
        let wordBeforeColon = false;
        let colonIndex = -1;
        let colon = false;
        let bracket = null;
        const brackets: Array<'(' | ')' | '{' | '}' | '[' | ']'> = [];
        const customProperty = start[1].startsWith('--');

        const tokens = [];
        let token = start;
        while (token) {
            type = token[0];
            tokens.push(token);

            if (type === '(' || type === '[') {
                if (!bracket) bracket = token;
                brackets.push(type === '(' ? ')' : ']');
            } else if (customProperty && colon && type === '{') {
                if (!bracket) bracket = token;
                brackets.push('}');
            } else if (brackets.length === 0) {
                if (type === ';') {
                    if (colon) {
                        /* mod: add empty prop if missing */
                        if (!wordBeforeColon) {
                            // must be a number because of "wordBeforeColon"
                            const colonToken = tokens[colonIndex];
                            tokens.splice(colonIndex, 0, [
                                'word',
                                '',
                                colonToken[2],
                                colonToken[2],
                            ]);
                        }
                        this.decl(tokens, customProperty);
                        return;
                    } else {
                        break;
                    }
                } else if (type === '{') {
                    this.rule(tokens);
                    return;
                } else if (type === '}') {
                    this.tokenizer.back(tokens.pop()!);
                    end = true;
                    break;
                } else if (type === ':') {
                    colon = true;
                    colonIndex = tokens.length - 1;
                }
            } else if (type === brackets[brackets.length - 1]) {
                brackets.pop();
                if (brackets.length === 0) bracket = null;
            } else if (type === 'word') {
                if (!colon) {
                    wordBeforeColon = true;
                }
            }

            token = this.tokenizer.nextToken();
        }

        if (this.tokenizer.endOfFile()) end = true;

        let node;
        if (this.current.type === 'root') {
            // assume rules only in top level
            node = this.unOpenedRule(tokens);
        } else if (end && colon) {
            // declaration-like last node
            if (!customProperty) {
                while (tokens.length) {
                    const tokenType = tokens[tokens.length - 1][0];
                    if (tokenType !== 'space' && tokenType !== 'comment') break;
                    this.tokenizer.back(tokens.pop()!);
                }
            }
            if (!wordBeforeColon) {
                const colonToken = tokens[colonIndex];
                tokens.splice(colonIndex, 0, ['word', '', colonToken[2], colonToken[2]]);
            }
            this.decl(tokens, customProperty);
            node = this.current.nodes[this.current.nodes.length - 1] as postcss.Declaration;
            this.reportNode(node, 'ambiguity', AMBIGUITY.POSSIBLE_UNOPENED_RULE);
        } else {
            // ambiguity: might be a rule or a declaration
            node = this.unOpenedRuleOrDecl(tokens, colon);
        }

        // keep track of  unclosed brackets
        if (brackets.length > 0) {
            this.reportNode(node, 'error', ERRORS.UNCLOSED_BRACKETS);
        }
    }
}
