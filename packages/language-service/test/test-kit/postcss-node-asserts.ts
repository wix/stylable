import type { Invalid } from '@stylable/language-service/dist/lib-new/invalid-node';
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
export function assertInvalid(node: any, msg?: string): Invalid {
    if (node?.type !== 'invalid') {
        throw new Error('expected invalid node' + (msg ? ` (${msg})` : ''));
    }
    return node;
}
