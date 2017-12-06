// import * as postcss from 'postcss';
import { Argument, SDecl } from '../src/stylable-processor';
import { getDeclStylable } from '../src/stylable-utils';

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

            if (node.type === 'function') {
                const formatterArguments: Argument[] = [];

                if (node.nodes && node.nodes.length > 0) {
                    node.nodes.forEach((n: any) => {
                        if (n.type === 'word') {
                            formatterArguments.push({value: n.value});
                        }
                    });
                }

                const declStylable = getDeclStylable(decl);
                declStylable.formatters.push({
                    name: node.value,
                    arguments: formatterArguments
                });
            }
        });
    }
}
