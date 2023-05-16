import type { BaseAstNode, Call, CustomIdent, Literal } from '@tokey/css-value-parser';

export interface FindAstOptions {
    stopOnFail: boolean;
    ignoreWhitespace: true;
    ignoreComments: true;
    stopOnMatch?: (node: BaseAstNode, index: number, nodes: BaseAstNode[]) => boolean;
    name?: string;
}

type FindAstResult<T extends BaseAstNode> = [takenNodeAmount: number, matchedNode: T | undefined];

export function findAnything(
    value: BaseAstNode[],
    startIndex: number,
    options?: Partial<FindAstOptions>
) {
    return findValueAstNode(value, startIndex, () => true, options);
}

export function findFatArrow(
    value: BaseAstNode[],
    startIndex: number,
    options?: Partial<FindAstOptions>
): [takenNodeAmount: number, EqlNode: Literal | undefined] {
    const [amountToEql] = findLiteral(value, startIndex, { ...options, name: '=' });
    if (amountToEql) {
        const nextNode = value[startIndex + amountToEql];
        if (nextNode?.type === 'literal' && nextNode.value === '>') {
            return [amountToEql + 1, nextNode];
        }
    }
    return [0, undefined];
}
export function findNextClassNode(
    value: BaseAstNode[],
    startIndex: number,
    options?: Partial<FindAstOptions>
): [takenNodeAmount: number, classNode: CustomIdent | undefined] {
    const name = options?.name || '';
    let index = startIndex;
    while (index < value.length) {
        const [amountToDot, _dotNode] = findLiteral(value, index, { ...options, name: '.' });
        if (amountToDot) {
            index += amountToDot;
            const [amountToName, nameNode] = findCustomIdent(value, index, {
                name,
                stopOnFail: true,
            });
            if (amountToName) {
                return [amountToDot + amountToName, nameNode];
            }
        }
        if (options?.stopOnFail) {
            break;
        }
        index++;
    }
    return [0, undefined];
}
export function findNextPseudoClassNode(
    value: BaseAstNode[],
    startIndex: number,
    options?: Partial<FindAstOptions>
): [takenNodeAmount: number, classNode: CustomIdent | Call | undefined] {
    const name = options?.name || '';
    let index = startIndex;
    while (index < value.length) {
        const [amountToColon] = findLiteral(value, index, { ...options, name: ':' });
        if (amountToColon) {
            index += amountToColon;
            const nameOptions: FindAstOptions = {
                name,
                stopOnFail: true,
                ignoreComments: true,
                ignoreWhitespace: true,
            };
            const [amountToName, nameNode] = findCustomIdent(value, index, nameOptions);

            if (amountToName) {
                return [amountToColon + amountToName, nameNode];
            } else {
                const [amountToCall, callNode] = findNextCallNode(value, index, nameOptions);
                if (amountToCall) {
                    return [amountToColon + amountToCall, callNode];
                }
            }
        } else if (options?.stopOnFail) {
            break;
        } else {
            index++;
        }
    }
    return [0, undefined];
}

export function findLiteral(
    value: BaseAstNode[],
    startIndex: number,
    options?: Partial<FindAstOptions>
) {
    const name = options?.name || '';
    return findValueAstNode<Literal>(
        value,
        startIndex,
        (node) => node.type === 'literal' && (!name || node.value === name),
        options
    );
}
export function findCustomIdent(
    value: BaseAstNode[],
    startIndex: number,
    options?: Partial<FindAstOptions>
) {
    const name = options?.name || '';
    return findValueAstNode<CustomIdent>(
        value,
        startIndex,
        (node) => node.type === '<custom-ident>' && (!name || node.value === name),
        options
    );
}
export function findNextCallNode(
    value: BaseAstNode[],
    startIndex: number,
    options?: Partial<FindAstOptions>
): [takenNodeAmount: number, classNode: Call | undefined] {
    const name = options?.name || '';
    return findValueAstNode(
        value,
        startIndex,
        (node) => node.type === 'call' && (!name || node.value === name),
        options
    );
}

export function findValueAstNode<T extends BaseAstNode>(
    valueAst: BaseAstNode[],
    startIndex: number,
    check: (node: BaseAstNode) => boolean,
    {
        stopOnFail = true,
        ignoreWhitespace = true,
        ignoreComments = true,
        stopOnMatch,
    }: Partial<FindAstOptions> = {}
): FindAstResult<T> {
    let index = startIndex;
    while (index < valueAst.length) {
        const node = valueAst[index];
        if (ignoreComments && node.type === 'comment') {
            // continue;
        } else if (ignoreWhitespace && node.type === 'space') {
            // continue;
        } else if (check(node)) {
            return [index - startIndex + 1, node as T];
        } else if (stopOnFail || stopOnMatch?.(node, index, valueAst)) {
            break;
        }
        index++;
    }
    return [0, undefined];
}
