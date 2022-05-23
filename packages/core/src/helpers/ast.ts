import type * as postcss from 'postcss';

// ToDo check empty file (position 0)
export function getAstNodeAt(
    root: postcss.Root,
    offset: number
): [node: postcss.AnyNode, offsetInNode: number] {
    let closestNode: postcss.AnyNode = root;
    let offsetInNode = 0;

    root.walk((node) => {
        if (node.source?.start && node.source?.end) {
            const inNode =
                node.source.start.offset <= offset && node.source.end.offset + 1 >= offset;
            if (!inNode) {
                // out of node: bailout
                return false;
            }
            closestNode = node;
            offsetInNode = offset - node.source.start.offset;
        }
        return;
    });

    return [closestNode, offsetInNode];
}
