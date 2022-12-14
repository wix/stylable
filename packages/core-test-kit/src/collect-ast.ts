import type * as postcss from 'postcss';

export function collectAst<Bucket extends string>(
    root: postcss.Root,
    collectCommentPrefix: Bucket[]
) {
    const collected = collectCommentPrefix.reduce((acc, name) => {
        acc[name] = [];
        return acc;
    }, {} as Record<Bucket, postcss.AnyNode[]>);
    const prefixRegex = `^(${collectCommentPrefix.join('|')})`;
    root.walk((node) => {
        const prevNode = node.prev();
        if (prevNode?.type === 'comment') {
            const foundPrefix = prevNode.text.match(prefixRegex);
            if (foundPrefix) {
                collected[foundPrefix[0] as Bucket].push(node);
            }
        }
    });
    return collected;
}
