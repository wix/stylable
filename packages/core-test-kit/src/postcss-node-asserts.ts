import type * as postcss from 'postcss';

export function assertRule(node: any, msg?: string): postcss.Rule {
    if (node?.type !== 'rule') {
        throw new Error('expected postcss rule' + (msg ? ` (${msg})` : ''));
    }
    return node;
}
export function assertAtRule(node: any, msg?: string): postcss.Rule {
    if (node?.type !== 'atrule') {
        throw new Error('expected postcss at-rule' + (msg ? ` (${msg})` : ''));
    }
    return node;
}
export function assertDecl(node: any, msg?: string): postcss.Declaration {
    if (node?.type !== 'decl') {
        throw new Error('expected postcss declaration' + (msg ? ` (${msg})` : ''));
    }
    return node;
}
export function assertComment(node: any, msg?: string): postcss.Comment {
    if (node?.type !== 'comment') {
        throw new Error('expected comment node' + (msg ? ` (${msg})` : ''));
    }
    return node;
}
