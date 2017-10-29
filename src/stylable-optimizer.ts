import * as postcss from 'postcss';

export function removeSTDirective(root: postcss.Root) {

    const toRemove: postcss.Node[] = [];

    root.walkRules((rule: postcss.Rule) => {
        if (rule.nodes && rule.nodes.length === 0) {
            toRemove.push(rule);
            return;
        }
        rule.walkDecls((decl: postcss.Declaration) => {
            if (decl.prop.startsWith('-st-')) {
                toRemove.push(decl);
            }
        });
    });

    toRemove.forEach(node => {
        removeRecursiveIfEmpty(node);
    });

}

function removeRecursiveIfEmpty(node: postcss.Node) {
    const parent = node.parent;
    node.remove();
    if (parent && parent.nodes && parent.nodes.length === 0) {
        removeRecursiveIfEmpty(parent);
    }
}
