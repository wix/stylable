import * as postcss from 'postcss';

export function matchRuleAndDeclaration(
    parent: postcss.Container,
    selectorIndex: number,
    selector: string,
    decl: string,
    msg?: string
) {
    const rule = parent.nodes![selectorIndex] as postcss.Rule;
    const errors = [];
    if (rule.selector !== selector) {
        errors.push(
            `${msg ? msg + ' ' : ''}selector ${selectorIndex} expected ${
                rule.selector
            } to equal ${selector}`
        );
    }
    // expect(rule.selector, `${msg ? msg + ' ' : ''}selector ${selectorIndex}`).to.equal(selector);
    const declRes = rule.nodes!.map(x => x.toString()).join(';');
    if (declRes !== decl) {
        errors.push(
            `${msg ? msg + ' ' : ''}selector ${selectorIndex} expected ${declRes} to equal ${decl}`
        );
    }
    if (errors.length) {
        throw new Error(errors.join('\n'));
    }
}

export function matchAllRulesAndDeclarations(
    parent: postcss.Container,
    all: string[][],
    msg?: string,
    offset: number = 0
) {
    all.forEach((_, i) => matchRuleAndDeclaration(parent, i + offset, _[0], _[1], msg));
}
