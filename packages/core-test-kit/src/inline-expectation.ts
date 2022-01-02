import type * as postcss from 'postcss';

interface Test {
    type: TestScopes;
    expectation: string;
    errors: string[];
}

type AST = postcss.Rule | postcss.AtRule;

const tests = {
    '@check': checkTest,
    '@rule': ruleTest,
    '@atrule': atRuleTest,
} as const;
type TestScopes = keyof typeof tests;
const testScopes = Object.keys(tests) as TestScopes[];
const testScopesRegex = () => testScopes.join(`|`);

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
    expectedTestsCount = result.toString().match(new RegExp(`${testScopesRegex()}`, `gm`))
        ?.length || 0
) {
    if (expectedTestsCount === 0) {
        // ToDo: test
        throw new Error(testInlineExpectsErrors.noTestsFound());
    }
    const checks: Test[] = [];
    const errors: string[] = [];

    // collect checks
    result.walkComments((comment) => {
        const input = comment.text.split(/@/gm);
        const node = comment.next() as AST;
        if (node) {
            while (input.length) {
                const next = `@` + input.shift()!;
                const testMatch = next.match(new RegExp(`^(${testScopesRegex()})`, `g`));
                if (testMatch) {
                    const testScope = testMatch[0] as TestScopes;
                    const testInput = next.replace(testScope, ``).trim();
                    if (testInput) {
                        const result = tests[testScope](testInput, node);
                        result.type = testScope;
                        errors.push(...result.errors);
                        checks.push(result);
                    }
                } else {
                    // ToDo: support @ in the expectation
                }
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

function checkTest(expectation: string, node: AST): Test {
    const type = node?.type;
    switch (type) {
        case `rule`: {
            return tests[`@rule`](expectation, node);
        }
        case `atrule`: {
            return tests[`@atrule`](expectation, node);
        }
        default:
            // ToDo: test
            return {
                type: `@check`,
                expectation,
                errors: [
                    node
                        ? `unsupported type "${type}" for "@check"`
                        : `@check must be placed above rule or at-rule`,
                ],
            };
    }
}
function ruleTest(expectation: string, node: AST): Test {
    const result: Test = {
        type: `@rule`,
        expectation,
        errors: [],
    };
    const { msg, ruleIndex, expectedSelector, expectedBody } = expectation.match(
        /(?<msg>\(.*\))*(\[(?<ruleIndex>\d+)\])*(?<expectedSelector>[^{}]*)\s*(?<expectedBody>.*)/s
    )!.groups!;
    let targetNode: AST = node;
    // get mixed-in rule
    if (ruleIndex) {
        if (node?.type !== `rule`) {
            result.errors.push(
                `mixed-in expectation is only supported for CSS Rule, not ${node?.type}`
            );
            return result;
        } else {
            const actualTarget = getNextMixinRule(node, Number(ruleIndex));
            if (!actualTarget) {
                result.errors.push(testInlineExpectsErrors.unfoundMixin(expectation));
                return result;
            }
            targetNode = actualTarget;
        }
    }
    // test by target node type
    const nodeType = targetNode?.type;
    if (nodeType === `rule`) {
        const expectedDeclarations: [string, string][] = [];
        const declsInput = expectedBody.trim().match(/^{(.*)}$/s);
        const declarationCheck: 'full' | 'none' = declsInput ? `full` : `none`;
        if (declsInput && declsInput[1]?.includes(`:`)) {
            for (const decl of declsInput[1].split(`;`)) {
                if (decl.trim() !== ``) {
                    const [prop, value] = decl.split(':');
                    if (prop && value) {
                        expectedDeclarations.push([prop.trim(), value.trim()]);
                    } else {
                        result.errors.push(
                            testInlineExpectsErrors.malformedDecl(decl, expectation)
                        );
                    }
                }
            }
        }
        const prefix = msg ? msg + `: ` : ``;
        if (targetNode.selector !== expectedSelector.trim()) {
            result.errors.push(
                testInlineExpectsErrors.selector(
                    expectedSelector.trim(),
                    targetNode.selector,
                    prefix
                )
            );
        }
        if (declarationCheck === `full`) {
            const actualDecl = targetNode.nodes.map((x) => x.toString()).join(`; `);
            const expectedDecl = expectedDeclarations
                .map(([prop, value]) => `${prop}: ${value}`)
                .join(`; `);
            if (actualDecl !== expectedDecl) {
                result.errors.push(
                    testInlineExpectsErrors.declarations(
                        expectedDecl,
                        actualDecl,
                        targetNode.selector,
                        prefix
                    )
                );
            }
        }
    } else if (nodeType === `atrule`) {
        // ToDo: implement mixed-in atrule
    } else {
        // ToDo: report unknown node type check
    }
    return result;
}
function atRuleTest(expectation: string, node: postcss.ChildNode): Test {
    const result: Test = {
        type: `@atrule`,
        expectation,
        errors: [],
    };
    const { msg, expectedParams } = expectation.match(/(?<msg>\([^)]*\))*(?<expectedParams>.*)/)!
        .groups!;
    if (expectedParams.match(/^\[\d+\]/)) {
        result.errors.push(testInlineExpectsErrors.atRuleMultiTest(expectation));
        return result;
    }
    const prefix = msg ? msg + `: ` : ``;
    if (node.type === `atrule`) {
        if (node.params !== expectedParams.trim()) {
            result.errors.push(
                testInlineExpectsErrors.atruleParams(expectedParams.trim(), node.params, prefix)
            );
        }
    } else {
        // ToDo: error on illegal node
    }
    return result;
}

function getNextMixinRule(currentRule: postcss.Rule, count: number): AST | undefined {
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
    noTestsFound: () =>
        `no tests found try to add "${testScopesRegex()}" comments before any selector`,
    matchAmount: (expectedAmount: number, actualAmount: number) =>
        `Expected ${expectedAmount} checks to run but there was ${actualAmount}`,
    selector: (expectedSelector: string, actualSelector: string, label = ``) =>
        `${label}expected "${actualSelector}" to transform to "${expectedSelector}"`,
    declarations: (expectedDecl: string, actualDecl: string, selector: string, label = ``) =>
        `${label}expected ${selector} to have declaration {${expectedDecl}}, but got {${actualDecl}}`,
    unfoundMixin: (expectInput: string) => `cannot locate mixed-in rule for "${expectInput}"`,
    malformedDecl: (decl: string, expectInput: string) =>
        `error in expectation "${decl}" of "${expectInput}"`,
    atruleParams: (expectedParams: string, actualParams: string, label = ``) =>
        `${label}expected ${actualParams} to transform to ${expectedParams}`,
    atRuleMultiTest: (comment: string) => `atrule mixin is not supported: (${comment})`,
    combine: (errors: string[]) => `\n${errors.join(`\n`)}`,
};
