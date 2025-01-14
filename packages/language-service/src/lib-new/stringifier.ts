import type { Invalid } from './invalid-node.js';
import BaseStringifier from 'postcss/lib/stringifier';
import type * as postcss from 'postcss';

export class Stringifier extends BaseStringifier {
    invalid(node: Invalid) {
        const string = node.value;
        this.builder(string, node as unknown as postcss.Rule);
    }
}

export const customStringify: postcss.Stringifier = (node, builder) => {
    new Stringifier(builder).stringify(node);
};

export const overrideNodeStringifier = (node: postcss.Node) => {
    const originalToString = node.toString;
    node.toString = (stringifier: postcss.Stringifier | postcss.Syntax = customStringify) => {
        return originalToString.call(node, stringifier);
    };
};
