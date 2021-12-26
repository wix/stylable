import { parse } from 'postcss';

export function formatCSS(css: string) {
    const ast = parse(css);
    const NL = getLineEnding(css);
    const indent = '    ';
    // TODO: handle indent nesting
    const indentLevel = 1;
    ast.nodes.forEach((node, i) => {
        // keep only one line after each rule
        if (node.type === 'rule') {
            const childrenLen = node.nodes.length;
            // TODO: handle case the raws contains comments
            node.raws.before = i !== 0 ? NL : '';
            node.raws.after = childrenLen ? NL : '';
            node.raws.between = ' ';
            node.raws.semicolon = childrenLen ? true : false;
            node.selector = formatSelectors(node.selectors);
            node.nodes.forEach((child) => {
                if (child.type === 'decl') {
                    // TODO: handle child.variable
                    // TODO: handle case the raws contains comments
                    child.raws.between = ': ';
                    child.raws.before = NL + indent.repeat(indentLevel);
                }
            });
        }
    });
    const outputCSS = ast.toString();
    return outputCSS.endsWith('\n') || outputCSS.length === 0 ? outputCSS : outputCSS + NL;
}

function formatSelectors(selectors: string[]) {
    // sort selectors by length from short to long
    selectors.sort((a, b) => a.length - b.length);
    // group selectors until reach upto 50 chars
    const maxSelectorLength = 50;
    const selectorsGrouped = [];
    let currentGroup = [];
    let currentGroupLength = 0;
    for (const selector of selectors) {
        currentGroup.push(selector);
        currentGroupLength += selector.length;
        if (currentGroupLength >= maxSelectorLength) {
            selectorsGrouped.push(currentGroup);
            currentGroup = [];
            currentGroupLength = 0;
        }
    }
    if (currentGroup.length) {
        selectorsGrouped.push(currentGroup);
    }
    // join selectors in each group with comma and space
    const selectorsFormatted = [];
    for (const group of selectorsGrouped) {
        selectorsFormatted.push(group.join(', '));
    }
    // join groups with new line
    return selectorsFormatted.join(',\n');
}

function formatValueList(values: string[]) {
    return values.join(', ');
}

// naive implementation
function getLineEnding(css: string) {
    for (const ch of css) {
        if (ch === '\r') {
            return '\r\n';
        }
        if (ch === '\n') {
            return '\n';
        }
    }
    return '\n';
}
