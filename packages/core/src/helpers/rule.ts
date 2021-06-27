import * as postcss from 'postcss';

export function isChildOfAtRule(rule: postcss.Container, atRuleName: string) {
    return (
        rule.parent &&
        rule.parent.type === 'atrule' &&
        (rule.parent as postcss.AtRule).name === atRuleName
    );
}

export function createWarningRule(
    extendedNode: string,
    scopedExtendedNode: string,
    extendedFile: string,
    extendingNode: string,
    scopedExtendingNode: string,
    extendingFile: string,
    useScoped = false
) {
    const message = `"class extending component '.${extendingNode} => ${scopedExtendingNode}' in stylesheet '${extendingFile}' was set on a node that does not extend '.${extendedNode} => ${scopedExtendedNode}' from stylesheet '${extendedFile}'" !important`;
    return postcss.rule({
        selector: `.${useScoped ? scopedExtendingNode : extendingNode}:not(.${
            useScoped ? scopedExtendedNode : extendedNode
        })::before`,
        nodes: [
            postcss.decl({
                prop: 'content',
                value: message,
            }),
            postcss.decl({
                prop: 'display',
                value: `block !important`,
            }),
            postcss.decl({
                prop: 'font-family',
                value: `monospace !important`,
            }),
            postcss.decl({
                prop: 'background-color',
                value: `red !important`,
            }),
            postcss.decl({
                prop: 'color',
                value: `white !important`,
            }),
        ],
    });
}
