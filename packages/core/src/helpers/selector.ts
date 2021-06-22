import {
    parseCssSelector,
    stringifySelectorAst,
    walk,
    SelectorNode,
    SelectorList,
} from '@tokey/css-selector-parser';

export const parseSelector = parseCssSelector;
export const stringifySelector = stringifySelectorAst;
export const walkSelector = walk;

export type { SelectorNode };

// ToDo: make the name more specific to what this means to say
export function isNested(parents: SelectorNode[]) {
    // ToDo: Should this account for other nesting? pseudo_element or others?
    // what about ::part(partName)?
    for (const parent of parents) {
        if (parent.type === `pseudo_class`) {
            return true;
        }
    }
    return false;
}

export function isRootValid(ast: SelectorList) {
    let isValid = true;
    walk(ast, (node, index, nodes) => {
        if (node.type === 'pseudo_class') {
            return walk.skipNested;
        }
        if (node.type === 'class' && node.value === `root`) {
            let isLastScopeGlobal = false;
            for (let i = 0; i < index; i++) {
                const part = nodes[i];
                if (isGlobal(part)) {
                    isLastScopeGlobal = true;
                }
                if (part.type === 'combinator' && !isLastScopeGlobal) {
                    isValid = false;
                    return walk.skipCurrentSelector;
                }
                if (part.type === 'element' || (part.type === 'class' && part.value !== 'root')) {
                    isLastScopeGlobal = false;
                }
            }
        }
        return undefined;
    });
    return isValid;
}

function isGlobal(node: SelectorNode) {
    return node.type === 'pseudo_class' && node.value === 'global';
}
