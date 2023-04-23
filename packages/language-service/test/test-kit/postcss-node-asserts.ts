import type { Invalid } from '@stylable/language-service/dist/lib-new/invalid-node';
export { assertAtRule, assertComment, assertDecl, assertRule } from '@stylable/core-test-kit';

export function assertInvalid(node: any, msg?: string): Invalid {
    if (node?.type !== 'invalid') {
        throw new Error('expected invalid node' + (msg ? ` (${msg})` : ''));
    }
    return node;
}
