import type { ParsedValue } from '../types';
import type { ReportWarning } from '../stylable-value-parsers';
import postcssValueParser from 'postcss-value-parser';

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
        if (reportWarning && currentArg.trim() === '') {
            reportWarning(
                `${postcssValueParser.stringify(
                    node as postcssValueParser.Node
                )}: argument at index ${argIndex} is empty`
            );
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
