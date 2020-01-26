import postcss from 'postcss';

export function matchRuleAndDeclaration(
    parent: postcss.Container,
    selectorIndex: number,
    selector: string,
    decl: string,
    msg?: string
) {
    const rule = parent.nodes![selectorIndex] as postcss.Rule;
    if (rule.selector !== selector) {
        throw new Error(
            `${msg ? msg + ' ' : ''}selector ${selectorIndex}\nactual: ${
                rule.selector
            }\nexpected: ${selector}`
        );
    }
    // expect(rule.selector, `${msg ? msg + ' ' : ''}selector ${selectorIndex}`).to.equal(selector);
    const actualDecl = rule.nodes!.map(x => x.toString()).join(';');
    if (actualDecl !== decl) {
        throw new Error(
            `${
                msg ? msg + ' ' : ''
            }selector ${selectorIndex} declaration\nactual: ${actualDecl}\nexpected: ${decl}`
        );
    }
}

export function matchAllRulesAndDeclarations(
    parent: postcss.Container,
    all: string[][],
    msg?: string,
    offset = 0
) {
    all.forEach((_, i) => matchRuleAndDeclaration(parent, i + offset, _[0], _[1], msg));
}
