import type { BaseAstNode, Call, CustomIdent, Literal } from '@tokey/css-value-parser';

export interface FindAstOptions {
    stopOnFail: boolean;
    ignoreWhitespace: boolean;
    ignoreComments: boolean;
    stopOnMatch?: (node: BaseAstNode, index: number, nodes: BaseAstNode[]) => boolean;
    name?: string;
}

type FindAstResult<T extends BaseAstNode> = [
    takenNodeAmount: number,
    matchedNode: T | undefined,
    inspectedAmount: number
];

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
): FindAstResult<Literal & { value: '>' }> {
    const [amountToEql, _eqlNode, eqlNodeInspectAmount] = findLiteral(value, startIndex, {
        ...options,
        name: '=',
    });
    if (amountToEql) {
        const nextNode = value[startIndex + amountToEql];
        if (isExactLiteral(nextNode, '>')) {
            return [amountToEql + 1, nextNode, amountToEql + 1];
        }
    }
    return [0, undefined, eqlNodeInspectAmount];
}
export function isExactLiteral<T extends string>(
    token: BaseAstNode,
    name: T
): token is Literal & { value: '>' } {
    return token && token.type === 'literal' && token.value === name;
}
export function findNextClassNode(
    value: BaseAstNode[],
    startIndex: number,
    options?: Partial<FindAstOptions>
): FindAstResult<CustomIdent> {
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
                return [amountToDot + amountToName, nameNode, index - startIndex + 1];
            }
        }
        if (options?.stopOnFail) {
            break;
        }
        index++;
    }
    return [0, undefined, value.length - startIndex];
}
export function findNextPseudoClassNode(
    value: BaseAstNode[],
    startIndex: number,
    options?: Partial<FindAstOptions>
): FindAstResult<CustomIdent | Call> {
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
                ignoreWhitespace: false,
            };
            const [amountToName, nameNode] = findCustomIdent(value, index, nameOptions);

            if (amountToName) {
                return [amountToColon + amountToName, nameNode, index - startIndex + 1];
            } else {
                const [amountToCall, callNode] = findNextCallNode(value, index, nameOptions);
                if (amountToCall) {
                    return [amountToColon + amountToCall, callNode, index - startIndex + 1];
                } else {
                    break;
                }
            }
        } else if (options?.stopOnFail) {
            break;
        } else {
            index++;
        }
    }
    return [0, undefined, value.length - startIndex];
}

export function findPseudoElementNode(
    value: BaseAstNode[],
    startIndex: number,
    options?: Partial<FindAstOptions>
): FindAstResult<CustomIdent | Call> {
    let index = startIndex;
    while (index < value.length) {
        // first colon
        const [amountToColon] = findLiteral(value, index, { ...options, name: ':' }); // second colon
        if (amountToColon) {
            index += amountToColon; // name
            const [amountToSecondColon] = findLiteral(value, index, {
                ...options,
                name: ':',
                stopOnFail: true,
                ignoreWhitespace: false,
            });
            if (amountToSecondColon) {
                index += amountToSecondColon;
                const [amountToName, nameNode] = findCustomIdent(value, index, {
                    ...options,
                    stopOnFail: true,
                });
                if (nameNode) {
                    return [
                        index - startIndex + amountToName,
                        nameNode,
                        index - startIndex + amountToName,
                    ];
                }
            }
        }
        if (options?.stopOnFail) {
            break;
        }
        index++;
    }
    return [0, undefined, index - startIndex];
}

export function findLiteral(
    value: BaseAstNode[],
    startIndex: number,
    options?: Partial<FindAstOptions>
): FindAstResult<Literal> {
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
): FindAstResult<CustomIdent> {
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
): FindAstResult<Call> {
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
            return [index - startIndex + 1, node as T, index - startIndex + 1];
        } else if (stopOnFail || stopOnMatch?.(node, index, valueAst)) {
            break;
        }
        index++;
    }
    return [0, undefined, index - startIndex];
}
