import type { ParsedValue } from '../types';
import postcssValueParser from 'postcss-value-parser';
import type { Node as ValueNode } from 'postcss-value-parser';
import { createDiagnosticReporter, DiagnosticBase } from '../diagnostics';

export type ReportWarning = (diagnostic: DiagnosticBase, options?: { word: string }) => void;

export const valueDiagnostics = {
    INVALID_NAMED_PARAMS: createDiagnosticReporter(
        '13001',
        'error',
        () => `invalid named parameters (e.g. "func(name value, [name value, ...])")`
    ),
    MISSING_REQUIRED_FORMATTER_ARG: createDiagnosticReporter(
        '13002',
        'error',
        (node: ParsedValue, argIndex: number) =>
            `${postcssValueParser.stringify(
                node as postcssValueParser.Node
            )}: argument at index ${argIndex} is empty`
    ),
};

export function getNamedArgs(node: ParsedValue) {
    const args: ParsedValue[][] = [];
    if (node.nodes.length) {
        args.push([]);
        node.nodes.forEach((node: any) => {
            if (node.type === 'div') {
                args.push([]);
            } else {
                const {
                    sourceIndex: _sourceIndex,
                    sourceEndIndex: _sourceEndIndex,
                    ...clone
                } = node;
                args[args.length - 1].push(clone);
            }
        });
    }

    // handle trailing comma
    return args.length && args[args.length - 1].length === 0 ? args.slice(0, -1) : args;
}

export function stringifyFunction(name: string, parsedNode: ParsedValue, perserveQuotes = false) {
    return `${name}(${getFormatterArgs(parsedNode, false, undefined, perserveQuotes).join(', ')})`;
}

export function getFormatterArgs(
    node: ParsedValue,
    allowComments = false,
    reportWarning?: ReportWarning,
    preserveQuotes = false
) {
    const argsResult = [];
    let currentArg = '';
    let argIndex = 0;
    for (const currentNode of node.nodes) {
        if (currentNode.type === 'div' && currentNode.value === ',') {
            checkEmptyArg();
            argIndex++;
            argsResult.push(currentArg.trim());
            currentArg = '';
        } else if (currentNode.type === 'comment') {
            if (allowComments) {
                currentArg +=
                    currentNode.resolvedValue || postcssValueParser.stringify(currentNode);
            }
        } else if (currentNode.type === 'string') {
            currentArg += preserveQuotes
                ? postcssValueParser.stringify(currentNode)
                : currentNode.value;
        } else {
            currentArg += currentNode.resolvedValue || postcssValueParser.stringify(currentNode);
        }
    }
    checkEmptyArg();
    argsResult.push(currentArg.trim());

    let i = argsResult.length;
    while (i--) {
        if (argsResult[i] === '') {
            argsResult.pop();
        } else {
            return argsResult;
        }
    }
    return argsResult;

    function checkEmptyArg() {
        if (reportWarning && argsResult.length && currentArg.trim() === '') {
            reportWarning(valueDiagnostics.MISSING_REQUIRED_FORMATTER_ARG(node, argIndex));
        }
    }
}

export function getStringValue(nodes: ParsedValue | ParsedValue[]): string {
    return postcssValueParser.stringify(nodes as postcssValueParser.Node, (node) => {
        if ((node as ParsedValue).resolvedValue !== undefined) {
            return (node as ParsedValue).resolvedValue as string | undefined;
        } else {
            // TODO: warn
            return undefined;
        }
    });
}

export function listOptions(node: any) {
    return groupValues(node.nodes)
        .map((nodes: any) =>
            postcssValueParser.stringify(nodes, (n: any) => {
                if (n.type === 'div') {
                    return null;
                } else if (n.type === 'string') {
                    return n.value;
                } else {
                    return undefined;
                }
            })
        )
        .filter((x: string) => typeof x === 'string');
}

export function groupValues(nodes: ValueNode[], divType = 'div') {
    const grouped: ValueNode[][] = [];
    let current: ValueNode[] = [];

    nodes.forEach((n: any) => {
        if (n.type === divType) {
            grouped.push(current);
            current = [];
        } else {
            current.push(n);
        }
    });

    const last = grouped[grouped.length - 1];

    if ((last && last !== current && current.length) || (!last && current.length)) {
        grouped.push(current);
    }
    return grouped;
}

export function validateAllowedNodesUntil(
    node: ParsedValue,
    i: number,
    untilType = 'div',
    allowed = ['comment']
) {
    i = 1;
    let current = node.nodes[i];
    while (current && current.type !== untilType) {
        if (!allowed.includes(current.type)) {
            return false;
        }
        i++;
        current = node.nodes[i];
    }

    return true;
}

export const strategies = {
    named: (node: any, reportWarning?: ReportWarning) => {
        const named: Record<string, string> = {};
        getNamedArgs(node).forEach((mixinArgsGroup) => {
            const argsDivider = mixinArgsGroup[1];
            if (mixinArgsGroup.length < 3 || (argsDivider && argsDivider.type !== 'space')) {
                if (reportWarning) {
                    const argValue = mixinArgsGroup[0];
                    reportWarning(valueDiagnostics.INVALID_NAMED_PARAMS(), {
                        word: argValue.value,
                    });
                }
                return;
            }
            named[mixinArgsGroup[0].value] = stringifyParam(mixinArgsGroup.slice(2));
        });
        return named;
    },
    args: (node: any, reportWarning?: ReportWarning) => {
        return getFormatterArgs(node, true, reportWarning).map((value) => ({ value }));
    },
};

function stringifyParam(nodes: any) {
    return postcssValueParser.stringify(nodes, (n: any) => {
        if (n.type === 'function') {
            return postcssValueParser.stringify(n);
        } else if (n.type === 'div') {
            return null;
        } else if (n.type === 'string') {
            return n.value;
        } else {
            return undefined;
        }
    });
}
