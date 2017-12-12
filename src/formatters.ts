// import * as postcss from 'postcss';
import { CSSResolve, JSResolve } from '../src/postcss-resolver';
import { SDecl } from '../src/stylable-processor';
import { getDeclStylable } from '../src/stylable-utils';
import { Pojo } from '../src/types';

export type ResolvedFormatter = Pojo<JSResolve|CSSResolve|null>;
export interface ParsedValue {
    type: string;
    value: string;
    nodes?: any;
}

const valueParser = require('postcss-value-parser');

export function processFormatters(decl: SDecl) {

    const value = valueParser(decl.value);
    recursivelyResolveFormatters(value, decl);

    return decl;
}

// collect nested formatters inside out ( f1(f2(x)) => [f2, f1] )
function recursivelyResolveFormatters(parsed: any, decl: SDecl) {
    if (parsed.nodes) {
        parsed.nodes.forEach((node: any) => {
            if (node.nodes && node.nodes.length > 0) {
                recursivelyResolveFormatters(node, decl);
            }

            if (node.type === 'function') { // TODO: Check against native functions, and treat them as words
                const declStylable = getDeclStylable(decl);
                declStylable.formatters.push({ name: node.value });
            }
        });
    }
}

export function resolveFormattersForValue(formatterFns: ResolvedFormatter, {type, value, nodes}: ParsedValue) {
    switch (type) {
        case 'function':
            const formatter = formatterFns[value];
            if (formatter) {
                const args: string[] = [];
                nodes.forEach((node: ParsedValue) => {
                    if (node.type === 'space' || node.type === 'div' || node.type === 'comment') { return; }

                    args.push(resolveFormattersForValue(formatterFns, node));
                });
                return formatter.symbol.apply(null, args);
            } else {
                return value;
            }
        case 'word':
        case 'string':
            return value;
        default: {
            if (nodes) {
                return nodes.map(resolveFormattersForValue.bind(null, formatterFns)).join('');
            }
        }
    }
}
