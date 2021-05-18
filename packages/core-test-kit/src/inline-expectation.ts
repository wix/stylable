import type * as postcss from 'postcss';

interface RuleCheck {
    kind: `rule`;
    rule: postcss.Rule;
    msg?: string;
    expectedSelector: string;
    expectedDeclarations: [string, string][];
    declarationCheck: 'full' | 'none';
}
interface AtRuleCheck {
    kind: `atrule`;
    rule: postcss.AtRule;
    msg?: string;
    expectedParams: string;
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
 *
 * support atrule params (anything between the @atrule and body or semicolon)
 * @check screen and (min-width: 900px)
 */
export function testInlineExpects(
    result: postcss.Root,
    expectedTestsCount = result.toString().match(/@check/gm)!.length
) {
    if (expectedTestsCount === 0) {
        throw new Error('no tests found try to add @check comments before any selector');
    }
    const checks: Array<RuleCheck | AtRuleCheck> = [];
    const errors: string[] = [];

    // collect checks
    result.walkComments((comment) => {
        const checksInput = comment.text.split(`@check`);
        const rule = comment.next();
        if (checksInput.length > 1 && rule) {
            if (rule.type === `rule`) {
                for (const checkInput of checksInput) {
                    if (checkInput.trim()) {
                        const check = createRuleCheck(rule, checkInput, errors);
                        if (check) {
                            checks.push(check);
                        }
                    }
                }
            }
            if (rule.type === `atrule`) {
                if (checksInput.length > 2) {
                    errors.push(testInlineExpectsErrors.atRuleMultiTest(comment.text));
                }
                const check = createAtRuleCheck(rule, checksInput[1]);
                if (check) {
                    checks.push(check);
                }
            }
        }
    });
    // check
    checks.forEach((check) => {
        if (check.kind === `rule`) {
            const { msg, rule, expectedSelector, expectedDeclarations, declarationCheck } = check;
            const prefix = msg ? msg + `: ` : ``;
            if (rule.selector !== expectedSelector) {
                errors.push(
                    testInlineExpectsErrors.selector(expectedSelector, rule.selector, prefix)
                );
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
        } else if (check.kind === `atrule`) {
            const { msg, rule, expectedParams } = check;
            const prefix = msg ? msg + `: ` : ``;
            if (rule.params !== expectedParams) {
                errors.push(
                    testInlineExpectsErrors.atruleParams(expectedParams, rule.params, prefix)
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
        kind: `rule`,
        msg,
        rule: targetRule,
        expectedSelector: expectedSelector.trim(),
        expectedDeclarations,
        declarationCheck,
    };
}
function createAtRuleCheck(rule: postcss.AtRule, expectInput: string): AtRuleCheck | undefined {
    const { msg, expectedParams } = expectInput.match(/(?<msg>\([^)]*\))*(?<expectedParams>.*)/)!
        .groups!;
    return {
        kind: `atrule`,
        msg,
        rule,
        expectedParams: expectedParams.trim(),
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
    atruleParams: (expectedParams: string, actualParams: string, label = ``) =>
        `${label}expected ${actualParams} to transform to ${expectedParams}`,
    atRuleMultiTest: (comment: string) => `atrule multi test is not supported (${comment})`,
    combine: (errors: string[]) => `\n${errors.join(`\n`)}`,
};
