import type { FunctionNode } from 'postcss-value-parser';

export const PROPERTY = `-st-global` as const;
export const GLOBAL_FUNC = 'st-global' as const;

const globalValueRegExp = new RegExp(`^${GLOBAL_FUNC}\\((.*?)\\)$`);

export function globalValue(str: string) {
    const match = str.match(globalValueRegExp);
    return match?.[1];
}

export function globalValueFromFunctionNode(funcNode: FunctionNode) {
    if (funcNode.value !== GLOBAL_FUNC) {
        return;
    }
    let globalValue = '';
    let unknownInput = false;
    for (const { type, value } of funcNode.nodes) {
        if (type === 'word') {
            globalValue = value;
        } else if (type === 'comment' || type === 'space') {
            // allow comments & spaced: do nothing
        } else {
            unknownInput = true;
        }
    }
    return unknownInput ? undefined : globalValue;
}
