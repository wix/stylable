import { parse, AnyNode } from 'postcss';

export function formatCSS(css: string) {
    const ast = parse(css);
    const NL = getLineEnding(css);
    const indent = '    ';
    const indentLevel = -1;

    formatAst(ast, 0, { NL, indent, indentLevel });
    const outputCSS = ast.toString();
    return outputCSS.endsWith('\n') || outputCSS.length === 0 ? outputCSS : outputCSS + NL;
}

type FormatOptions = {
    NL: string;
    indent: string;
    indentLevel: number;
};

function formatAst(ast: AnyNode, index: number, options: FormatOptions) {
    const { NL, indent, indentLevel } = options;
    if (ast.type === 'atrule') {
        throw 'not implemented';
    } else if (ast.type === 'rule') {
        const childrenLen = ast.nodes.length;
        // TODO: handle case the raws contains comments
        ast.raws.before = index !== 0 ? NL : '';
        ast.raws.after = childrenLen ? NL : '';
        ast.raws.between = ' ';
        ast.raws.semicolon = childrenLen ? true : false;
        ast.selector = formatSelectors(ast.selectors);
    } else if (ast.type === 'decl') {
        if (ast.variable) {
            // TODO: handle case the raws contains comments
            ast.raws.between = ast.raws.between?.trimStart() || ':' /* no space here! */;
        } else {
            // TODO: handle case the raws contains comments
            ast.raws.between = ': ';
            if (ast.raws.value) {
                ast.raws.value.raw = ast.raws.value.value;
            }
        }
        ast.raws.before = NL + indent.repeat(indentLevel);
    } else if (ast.type === 'comment') {
        /* TODO */
    }
    if ('nodes' in ast) {
        ast.nodes.forEach((node, i) =>
            formatAst(node, i, { NL, indent, indentLevel: indentLevel + 1 })
        );
    }
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

// function formatValueList(values: string[]) {
//     return values.join(', ');
// }

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
