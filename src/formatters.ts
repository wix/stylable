// import * as postcss from 'postcss';
import { SDecl } from '../src/stylable-processor';
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
            if (node.nodes) {
                recursivelyResolveFormatters(node, decl);
            }
        });
    }

    if (parsed.type === 'function') {
        const declStylable = getDeclStylable(decl);
        declStylable.formatters.push(parsed.value);
    }
}
