import type * as postcss from 'postcss';

interface RuleCheck {
    rule: postcss.Rule;
    msg?: string;
    expectedSelector: string;
    expectedDeclarations: [string, string][];
    declarationCheck: 'full' | 'none';
}

/**
 * Test transformed stylesheets inline expectation comments
 * rule checking (place just before rule)
 *
 * full options:
 * @check(label)[5] .selector {decl: value}
 *
 * basic:
 * @check .selector
 *
 * with declarations (will check full match and order):
 * @check .selector {decl1: value; decl2: value}
 *
 * label for check:
 * @check(label for test) .selector
 *
 * target generated rules (mixin):
 * @check[4] .selector
 *
 * support multi line declarations:
 * @check .selector {
 *     decl1: value;
 *     decl2: value;
 * }
 *
 * support multi checks:
 * @check .selector
 * @check[1] .selector:hover
 */
export function testInlineExpects(
    result: postcss.Root,
    expectedTestsCount = result.toString().match(/@check/gm)!.length
) {
    if (expectedTestsCount === 0) {
        throw new Error('no tests found try to add @check comments before any selector');
    }
    const checks: RuleCheck[] = [];
    const errors: string[] = [];

    // collect checks
    result.walkRules((rule) => {
        const p = rule.prev();
        if (p && p.type === 'comment') {
            const checksInput = p.text.split(`@check`);
            for (const checkInput of checksInput) {
                if (checkInput.trim()) {
                    const check = createRuleCheck(rule, checkInput, errors);
                    if (check) {
                        checks.push(check);
                    }
                }
            }
        }
    });
    // check
    checks.forEach(({ msg, rule, expectedSelector, expectedDeclarations, declarationCheck }) => {
        const prefix = msg ? msg + `: ` : ``;
        if (rule.selector !== expectedSelector) {
            errors.push(testInlineExpectsErrors.selector(expectedSelector, rule.selector, prefix));
        }
        if (declarationCheck === `full`) {
            const actualDecl = rule.nodes.map((x) => x.toString()).join(`; `);
            const expectedDecl = expectedDeclarations
                .map(([prop, value]) => `${prop}: ${value}`)
                .join(`; `);
            if (actualDecl !== expectedDecl) {
                errors.push(
                    testInlineExpectsErrors.declarations(
                        expectedDecl,
                        actualDecl,
                        rule.selector,
                        prefix
                    )
                );
            }
        }
    });
    // report errors
    if (errors.length) {
        throw new Error(testInlineExpectsErrors.combine(errors));
    }
    if (expectedTestsCount !== checks.length) {
        throw new Error(testInlineExpectsErrors.matchAmount(expectedTestsCount, checks.length));
    }
}

function createRuleCheck(
    rule: postcss.Rule,
    expectInput: string,
    errors: string[]
): RuleCheck | undefined {
    const { msg, ruleIndex, expectedSelector, expectedBody } = expectInput.match(
        /(?<msg>\(.*\))*(\[(?<ruleIndex>\d+)\])*(?<expectedSelector>[^{}]*)\s*(?<expectedBody>.*)/s
    )!.groups!;
    const targetRule = ruleIndex ? getNextMixinRule(rule, Number(ruleIndex)) : rule;
    if (!targetRule) {
        errors.push(testInlineExpectsErrors.unfoundMixin(expectInput));
        return;
    }
    const expectedDeclarations: RuleCheck[`expectedDeclarations`] = [];
    const declsInput = expectedBody.trim().match(/^{(.*)}$/s);
    const declarationCheck: RuleCheck[`declarationCheck`] = declsInput ? `full` : `none`;
    if (declsInput && declsInput[1]?.includes(`:`)) {
        for (const decl of declsInput[1].split(`;`)) {
            if (decl.trim() !== ``) {
                const [prop, value] = decl.split(':');
                if (prop && value) {
                    expectedDeclarations.push([prop.trim(), value.trim()]);
                } else {
                    errors.push(testInlineExpectsErrors.malformedDecl(decl, expectInput));
                }
            }
        }
    }
    return {
        msg,
        rule: targetRule,
        expectedSelector: expectedSelector.trim(),
        expectedDeclarations,
        declarationCheck,
    };
}

function getNextMixinRule(currentRule: postcss.Rule, count: number): postcss.Rule | undefined {
    while (currentRule && count > 0) {
        const next: postcss.ChildNode | undefined = currentRule.next();
        // next must be a rule sense mixin can only add rules
        if (next?.type === `rule`) {
            currentRule = next;
            count--;
        } else {
            return;
        }
    }
    return currentRule && count === 0 ? currentRule : undefined;
}

export const testInlineExpectsErrors = {
    matchAmount: (expectedAmount: number, actualAmount: number) =>
        `Expected ${expectedAmount} checks to run but there was ${actualAmount}`,
    selector: (expectedSelector: string, actualSelector: string, label = ``) =>
        `${label}expected ${actualSelector} to transform to ${expectedSelector}`,
    declarations: (expectedDecl: string, actualDecl: string, selector: string, label = ``) =>
        `${label}expected ${selector} to have declaration {${expectedDecl}}, but got {${actualDecl}}`,
    unfoundMixin: (expectInput: string) => `cannot locate mixed-in rule for "${expectInput}"`,
    malformedDecl: (decl: string, expectInput: string) =>
        `error in expectation "${decl}" of "${expectInput}"`,
    combine: (errors: string[]) => `\n${errors.join(`\n`)}`,
};
