import postcss from 'postcss';
import { Diagnostics } from './diagnostics';
import { processPseudoStates } from './pseudo-states';
import { parseSelector } from './selector-utils';
import { ParsedValue, StateParsedValue } from './types';

const valueParser = require('postcss-value-parser');

export const valueParserWarnings = {
    VALUE_CANNOT_BE_STRING() {
        return 'value can not be a string (remove quotes?)';
    },
    CSS_MIXIN_FORCE_NAMED_PARAMS() {
        return 'CSS mixins must use named parameters (e.g. "func(name value, [name value, ...])")';
    }
};

export interface MappedStates {
    [s: string]: StateParsedValue | string | null;
}

// TODO: remove
export interface TypedClass {
    '-st-root'?: boolean;
    '-st-states'?: string[] | MappedStates;
    '-st-extends'?: string;
}

export interface MixinValue {
    type: string;
    options: Array<{ value: string }> | Record<string, string>;
}

export interface ArgValue {
    type: string;
    value: string;
}
export interface ExtendsValue {
    symbolName: string;
    args: ArgValue[][] | null;
}

type ReportWarning = (message: string, options?: { word: string }) => void;

export const rootValueMapping = {
    vars: ':vars' as ':vars',
    import: ':import' as ':import',
    stScope: 'st-scope' as 'st-scope',
    namespace: 'namespace' as 'namespace'
};

export const valueMapping = {
    from: '-st-from' as '-st-from',
    named: '-st-named' as '-st-named',
    default: '-st-default' as '-st-default',
    root: '-st-root' as '-st-root',
    states: '-st-states' as '-st-states',
    extends: '-st-extends' as '-st-extends',
    mixin: '-st-mixin' as '-st-mixin',
    global: '-st-global' as '-st-global'
};

export type stKeys = keyof typeof valueMapping;

export const stValues: string[] = Object.keys(valueMapping).map(key => valueMapping[key as stKeys]);
export const stValuesMap: Record<string, boolean> = Object.keys(valueMapping).reduce((acc, key) => {
    acc[valueMapping[key as stKeys]] = true;
    return acc;
}, {} as Record<string, boolean>);

export const STYLABLE_VALUE_MATCHER = /^-st-/;
export const STYLABLE_NAMED_MATCHER = new RegExp(`^${valueMapping.named}-(.+)`);

export const SBTypesParsers = {
    '-st-root'(value: string) {
        return value === 'false' ? false : true;
    },
    '-st-global'(decl: postcss.Declaration, _diagnostics: Diagnostics) {
        // Experimental
        const selector: any = parseSelector(decl.value.replace(/^['"]/, '').replace(/['"]$/, ''));
        return selector.nodes[0].nodes;
    },
    '-st-states'(value: string, decl: postcss.Declaration, diagnostics: Diagnostics) {
        if (!value) {
            return {};
        }

        return processPseudoStates(value, decl, diagnostics);
    },
    '-st-extends'(value: string) {
        const ast = valueParser(value);
        const types: ExtendsValue[] = [];

        ast.walk((node: any) => {
            if (node.type === 'function') {
                const args = getNamedArgs(node);

                types.push({
                    symbolName: node.value,
                    args
                });

                return false;
            } else if (node.type === 'word') {
                types.push({
                    symbolName: node.value,
                    args: null
                });
            }
            return undefined;
        }, false);

        return {
            ast,
            types
        };
    },
    '-st-named'(value: string) {
        const namedMap: { [key: string]: string } = {};
        if (value) {
            value.split(',').forEach(name => {
                const parts = name.trim().split(/\s+as\s+/);
                if (parts.length === 1) {
                    namedMap[parts[0]] = parts[0];
                } else if (parts.length === 2) {
                    namedMap[parts[1]] = parts[0];
                }
            });
        }

        return namedMap;
    },
    '-st-mixin'(
        mixinNode: postcss.Declaration,
        strategy: (type: string) => 'named' | 'args',
        diagnostics?: Diagnostics
    ) {
        const ast = valueParser(mixinNode.value);
        const mixins: Array<{
            type: string;
            options: Array<{ value: string }> | Record<string, string>;
        }> = [];

        function reportWarning(message: string, options?: { word: string }) {
            if (diagnostics) {
                diagnostics.warn(mixinNode, message, options);
            }
        }

        ast.nodes.forEach((node: any) => {
            const strat = strategy(node.value);
            if (node.type === 'function') {
                mixins.push({
                    type: node.value,
                    options: strategies[strat](node, reportWarning)
                });
            } else if (node.type === 'word') {
                mixins.push({
                    type: node.value,
                    options: strat === 'named' ? {} : []
                });
            } else if (node.type === 'string' && diagnostics) {
                diagnostics.error(mixinNode, valueParserWarnings.VALUE_CANNOT_BE_STRING(), {
                    word: mixinNode.value
                });
            }
        });

        return mixins;
    }
};

export function getNamedArgs(node: ParsedValue) {
    const args: ParsedValue[][] = [];
    if (node.nodes.length) {
        args.push([]);
        node.nodes.forEach((node: any) => {
            if (node.type === 'div') {
                args.push([]);
            } else {
                const { sourceIndex, ...clone } = node;
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
    _reportWarning?: ReportWarning,
    perserveQuotes = false
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
                currentArg += currentNode.resolvedValue || valueParser.stringify(currentNode);
            }
        } else if (currentNode.type === 'string') {
            currentArg += perserveQuotes ? valueParser.stringify(currentNode) : currentNode.value;
        } else {
            currentArg += currentNode.resolvedValue || valueParser.stringify(currentNode);
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
        if (currentArg.trim() === '' && _reportWarning) {
            _reportWarning(
                `${valueParser.stringify(node)}: argument at index ${argIndex} is empty`
            );
        }
    }
}

export function getStringValue(nodes: ParsedValue | ParsedValue[]): string {
    return valueParser.stringify(nodes, (node: ParsedValue) => {
        if (node.resolvedValue !== undefined) {
            return node.resolvedValue;
        } else {
            // TODO: warn
            return undefined;
        }
    });
}

export function groupValues(nodes: any[], divType = 'div') {
    const grouped: any[] = [];
    let current: any[] = [];

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

export const strategies = {
    named: (node: any, reportWarning?: ReportWarning) => {
        const named: Record<string, string> = {};
        getNamedArgs(node).forEach(mixinArgsGroup => {
            const argsDivider = mixinArgsGroup[1];
            if (mixinArgsGroup.length < 3 || (argsDivider && argsDivider.type !== 'space')) {
                if (reportWarning) {
                    const argValue = mixinArgsGroup[0];
                    reportWarning(valueParserWarnings.CSS_MIXIN_FORCE_NAMED_PARAMS(), {
                        word: argValue.value
                    });
                }
                return;
            }
            named[mixinArgsGroup[0].value] = stringifyParam(mixinArgsGroup.slice(2));
        });
        return named;
    },
    args: (node: any, reportWarning?: ReportWarning) => {
        return getFormatterArgs(node, true, reportWarning).map(value => ({ value }));
    }
};

function stringifyParam(nodes: any) {
    return valueParser.stringify(nodes, (n: any) => {
        if (n.type === 'div') {
            return null;
        } else if (n.type === 'string') {
            return n.value;
        } else {
            return undefined;
        }
    });
}

export function listOptions(node: any) {
    return groupValues(node.nodes)
        .map((nodes: any) =>
            valueParser.stringify(nodes, (n: any) => {
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
