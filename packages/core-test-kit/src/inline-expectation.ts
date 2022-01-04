import { matchDiagnostic } from './diagnostics';
import type { StylableMeta, DiagnosticType } from '@stylable/core';
import type * as postcss from 'postcss';

interface Test {
    type: TestScopes;
    expectation: string;
    errors: string[];
}

type AST = postcss.Rule | postcss.AtRule | postcss.Declaration;

const tests = {
    '@check': checkTest,
    '@rule': ruleTest,
    '@atrule': atRuleTest,
    '@decl': declTest,
    '@analyze': analyzeTest,
    '@transform': transformTest,
} as const;
type TestScopes = keyof typeof tests;
const testScopes = Object.keys(tests) as TestScopes[];
const testScopesRegex = () => testScopes.join(`|`);

interface Context {
    meta: Pick<StylableMeta, 'outputAst' | 'rawAst' | 'diagnostics' | 'transformDiagnostics'>;
}
const isRoot = (val: any): val is postcss.Root => val.type === `root`;

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
export function testInlineExpects(result: postcss.Root | Context, expectedTestInput?: number) {
    // backward compatibility (no diagnostic checks)
    const isDeprecatedInput = isRoot(result);
    const context = isDeprecatedInput
        ? {
              meta: {
                  outputAst: result,
                  rawAst: null as unknown as StylableMeta['rawAst'],
                  diagnostics: null as unknown as StylableMeta['diagnostics'],
                  transformDiagnostics: null as unknown as StylableMeta['transformDiagnostics'],
              },
          }
        : result;
    // ToDo: support analyze mode
    const rootAst = context.meta.outputAst!;
    const expectedTestAmount =
        expectedTestInput ??
        (rootAst.toString().match(new RegExp(`${testScopesRegex()}`, `gm`))?.length || 0);
    const checks: Test[] = [];
    const errors: string[] = [];
    // collect checks
    rootAst.walkComments((comment) => {
        const input = comment.text.split(/@/gm);
        const testCommentTarget = comment;
        const testCommentSrc = isDeprecatedInput
            ? comment
            : getSourceComment(context.meta, comment) || comment;
        const nodeTarget = testCommentTarget.next() as AST;
        const nodeSrc = testCommentSrc.next() as AST;
        if (nodeTarget || nodeSrc) {
            while (input.length) {
                const next = `@` + input.shift()!;
                const testMatch = next.match(new RegExp(`^(${testScopesRegex()})`, `g`));
                if (testMatch) {
                    const testScope = testMatch[0] as TestScopes;
                    let testInput = next.replace(testScope, ``);
                    // collect expectation inner `@` fragments
                    while (
                        input.length &&
                        !(`@` + input[0]).match(new RegExp(`^(${testScopesRegex()})`, `g`))
                    ) {
                        testInput += `@` + input.shift();
                    }
                    if (testInput) {
                        if (
                            isDeprecatedInput &&
                            (testScope === `@analyze` || testScope === `@transform`)
                        ) {
                            // not possible with just AST root
                            const result: Test = {
                                type: testScope,
                                expectation: testInput.trim(),
                                errors: [
                                    testInlineExpectsErrors.deprecatedRootInputNotSupported(
                                        testScope + testInput
                                    ),
                                ],
                            };
                            errors.push(...result.errors);
                            checks.push(result);
                        } else {
                            const result = tests[testScope](
                                context,
                                testInput.trim(),
                                nodeTarget,
                                nodeSrc
                            );
                            result.type = testScope;
                            errors.push(...result.errors);
                            checks.push(result);
                        }
                    }
                }
            }
        }
    });
    // report errors
    if (errors.length) {
        throw new Error(testInlineExpectsErrors.combine(errors));
    }
    if (expectedTestAmount !== checks.length) {
        throw new Error(testInlineExpectsErrors.matchAmount(expectedTestAmount, checks.length));
    }
}

function checkTest(context: Context, expectation: string, targetNode: AST, srcNode: AST): Test {
    const type = targetNode?.type;
    switch (type) {
        case `rule`: {
            return tests[`@rule`](context, expectation, targetNode, srcNode);
        }
        case `atrule`: {
            return tests[`@atrule`](context, expectation, targetNode, srcNode);
        }
        default:
            return {
                type: `@check`,
                expectation,
                errors: [testInlineExpectsErrors.unsupportedNode(`@check`, type)],
            };
    }
}
function ruleTest(_context: Context, expectation: string, targetNode: AST, _srcNode: AST): Test {
    const result: Test = {
        type: `@rule`,
        expectation,
        errors: [],
    };
    const { msg, ruleIndex, expectedSelector, expectedBody } = expectation.match(
        /(?<msg>\(.*\))*(\[(?<ruleIndex>\d+)\])*(?<expectedSelector>[^{}]*)\s*(?<expectedBody>.*)/s
    )!.groups!;
    let testNode: AST = targetNode;
    // get mixed-in rule
    if (ruleIndex) {
        if (targetNode?.type !== `rule`) {
            result.errors.push(
                `mixed-in expectation is only supported for CSS Rule, not ${targetNode?.type}`
            );
            return result;
        } else {
            const actualTarget = getNextMixinRule(targetNode, Number(ruleIndex));
            if (!actualTarget) {
                result.errors.push(testInlineExpectsErrors.unfoundMixin(expectation));
                return result;
            }
            testNode = actualTarget as AST;
        }
    }
    // test by target node type
    const nodeType = testNode?.type;
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
                            testInlineExpectsErrors.ruleMalformedDecl(decl, expectation)
                        );
                    }
                }
            }
        }
        const prefix = msg ? msg + `: ` : ``;
        if (testNode.selector !== expectedSelector.trim()) {
            result.errors.push(
                testInlineExpectsErrors.selector(expectedSelector.trim(), testNode.selector, prefix)
            );
        }
        if (declarationCheck === `full`) {
            const actualDecl = testNode.nodes.map((x) => x.toString()).join(`; `);
            const expectedDecl = expectedDeclarations
                .map(([prop, value]) => `${prop}: ${value}`)
                .join(`; `);
            if (actualDecl !== expectedDecl) {
                result.errors.push(
                    testInlineExpectsErrors.declarations(
                        expectedDecl,
                        actualDecl,
                        testNode.selector,
                        prefix
                    )
                );
            }
        }
    } else {
        // unsupported mixed-in node test
        result.errors.push(testInlineExpectsErrors.unsupportedMixinNode(testNode.type));
    }
    return result;
}
function atRuleTest(_context: Context, expectation: string, targetNode: AST, _srcNode: AST): Test {
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
    if (targetNode.type === `atrule`) {
        if (targetNode.params !== expectedParams.trim()) {
            result.errors.push(
                testInlineExpectsErrors.atruleParams(
                    expectedParams.trim(),
                    targetNode.params,
                    prefix
                )
            );
        }
    } else {
        result.errors.push(testInlineExpectsErrors.unsupportedNode(`@atrule`, targetNode.type));
    }
    return result;
}
function declTest(_context: Context, expectation: string, targetNode: AST, _srcNode: AST): Test {
    const result: Test = {
        type: `@decl`,
        expectation,
        errors: [],
    };
    let { label, prop, value } = expectation.match(
        /(?<label>\([^)]*\))*(?<prop>[^:]*)\s*:?\s*(?<value>.*)/
    )!.groups!;
    label = label ? label + `: ` : ``;
    prop = prop.trim();
    value = value.trim();
    if (!prop || !value) {
        result.errors.push(testInlineExpectsErrors.declMalformed(prop, value, label));
    } else if (targetNode.type === `decl`) {
        if (targetNode.prop !== prop.trim() || targetNode.value !== value) {
            const expected = prop.trim() + `: ` + value.trim();
            const actual = targetNode.prop + `: ` + targetNode.value;
            result.errors.push(testInlineExpectsErrors.decl(expected, actual, label));
        }
    } else {
        result.errors.push(
            testInlineExpectsErrors.unsupportedNode(`@decl`, targetNode.type, label)
        );
    }
    return result;
}
function analyzeTest({ meta }: Context, expectation: string, _targetNode: AST, srcNode: AST): Test {
    const result: Test = {
        type: `@analyze`,
        expectation,
        errors: [],
    };
    const matchResult = expectation.match(
        /-(?<severity>\w+)(?<label>\([^)]*\))?\s?(?:word:(?<word>[^\s]*))?\s?(?<message>.*)/
    );
    if (!matchResult) {
        result.errors.push(testInlineExpectsErrors.analyzeMalformed(expectation));
        return result;
    }
    let { label, severity, message, word } = matchResult.groups!;
    label = label ? label + `: ` : ``;
    severity = severity?.trim() || ``;
    message = message?.trim() || ``;
    word = word?.trim() || ``;

    if (!message) {
        result.errors.push(testInlineExpectsErrors.analyzeMalformed(expectation, label));
        return result;
    }
    // check for diagnostic
    const error = matchDiagnostic(
        `analyze`,
        meta,
        {
            label,
            message,
            severity,
            location: {
                start: srcNode.source?.start,
                end: srcNode.source?.end,
                word,
                css: ``,
            },
        },
        {
            diagnosticsNotFound: testInlineExpectsErrors.diagnosticsNotFound,
            unsupportedSeverity: testInlineExpectsErrors.diagnosticsUnsupportedSeverity,
            locationMismatch: testInlineExpectsErrors.diagnosticsLocationMismatch,
            wordMismatch: testInlineExpectsErrors.diagnosticsWordMismatch,
            severityMismatch: testInlineExpectsErrors.diagnosticsSeverityMismatch,
            expectedNotFound: testInlineExpectsErrors.diagnosticExpectedNotFound,
        }
    );
    if (error) {
        result.errors.push(error);
    }
    return result;
}
function transformTest(
    { meta }: Context,
    expectation: string,
    _targetNode: AST,
    srcNode: AST
): Test {
    const result: Test = {
        type: `@transform`,
        expectation,
        errors: [],
    };
    const matchResult = expectation.match(
        /-(?<severity>\w+)(?<label>\([^)]*\))?\s?(?:word:(?<word>[^\s]*))?\s?(?<message>.*)/
    );
    if (!matchResult) {
        result.errors.push(testInlineExpectsErrors.transformMalformed(expectation));
        return result;
    }
    let { label, severity, message, word } = matchResult.groups!;
    label = label ? label + `: ` : ``;
    severity = severity?.trim() || ``;
    message = message?.trim() || ``;
    word = word?.trim() || ``;

    if (!message) {
        result.errors.push(testInlineExpectsErrors.transformMalformed(expectation, label));
        return result;
    }
    // check for diagnostic
    const error = matchDiagnostic(
        `transform`,
        meta,
        {
            label,
            message,
            severity,
            location: {
                start: srcNode.source?.start,
                end: srcNode.source?.end,
                word,
                css: ``,
            },
        },
        {
            diagnosticsNotFound: testInlineExpectsErrors.diagnosticsNotFound,
            unsupportedSeverity: testInlineExpectsErrors.diagnosticsUnsupportedSeverity,
            locationMismatch: testInlineExpectsErrors.diagnosticsLocationMismatch,
            wordMismatch: testInlineExpectsErrors.diagnosticsWordMismatch,
            severityMismatch: testInlineExpectsErrors.diagnosticsSeverityMismatch,
            expectedNotFound: testInlineExpectsErrors.diagnosticExpectedNotFound,
        }
    );
    if (error) {
        result.errors.push(error);
    }
    return result;
}

function getSourceComment(meta: Context['meta'], { source }: postcss.Comment) {
    let match: postcss.Comment | undefined = undefined;
    meta.rawAst.walkComments((srcComment) => {
        if (
            srcComment.source?.start?.offset === source?.start?.offset &&
            srcComment.source?.end?.offset === source?.end?.offset
        ) {
            match = srcComment;
            return false;
        }
        return;
    });
    return match;
}

function getNextMixinRule(originRule: postcss.Rule, count: number) {
    let current: postcss.Node | undefined = originRule;
    while (current && count > 0) {
        current = current.next();
        if (current?.type !== `comment`) {
            count--;
        }
    }
    return current && count === 0 ? current : undefined;
}

export const testInlineExpectsErrors = {
    matchAmount: (expectedAmount: number, actualAmount: number) =>
        `Expected ${expectedAmount} checks to run but there was ${actualAmount}`,
    unsupportedNode: (testType: string, nodeType: string, label = ``) =>
        `${label}unsupported type "${testType}" for "${nodeType}"`,
    selector: (expectedSelector: string, actualSelector: string, label = ``) =>
        `${label}expected "${actualSelector}" to transform to "${expectedSelector}"`,
    declarations: (expectedDecl: string, actualDecl: string, selector: string, label = ``) =>
        `${label}expected ${selector} to have declaration {${expectedDecl}}, but got {${actualDecl}}`,
    unfoundMixin: (expectInput: string) => `cannot locate mixed-in rule for "${expectInput}"`,
    unsupportedMixinNode: (type: string) => `unsupported mixin expectation of type ${type}`,
    ruleMalformedDecl: (decl: string, expectInput: string) =>
        `error in expectation "${decl}" of "${expectInput}"`,
    atruleParams: (expectedParams: string, actualParams: string, label = ``) =>
        `${label}expected ${actualParams} to transform to ${expectedParams}`,
    atRuleMultiTest: (comment: string) => `atrule mixin is not supported: (${comment})`,
    decl: (expected: string, actual: string, label = ``) =>
        `${label}expected "${actual}" to transform to "${expected}"`,
    declMalformed: (expectedProp: string, expectedLabel: string, label = ``) => {
        if (!expectedProp && !expectedLabel) {
            return `${label}malformed declaration expectation, format should be: "prop: value"`;
        } else if (!expectedProp) {
            return `${label}malformed declaration expectation missing prop: "???: ${expectedLabel}"`;
        } else {
            return `${label}malformed declaration expectation missing value: "${expectedProp}: ???"`;
        }
    },
    deprecatedRootInputNotSupported: (expectation: string) =>
        `"${expectation}" is not supported for with the used input, try calling testInlineExpects(generateStylableResults())`,
    analyzeMissingDiagnostic: ({
        message,
        label = ``,
    }: {
        severity: DiagnosticType;
        message: string;
        label?: string;
    }) => `${label}expected "${message}" diagnostic`,
    analyzeMalformed: (expectation: string, label = ``) =>
        `${label}malformed @analyze expectation "@analyze${expectation}". format should be: "analyze-[severity] diagnostic message"`,
    transformMalformed: (expectation: string, label = ``) =>
        `${label}malformed @transform expectation "@transform${expectation}". format should be: "transform-[severity] diagnostic message"`,
    diagnosticsNotFound: (type: string, message: string, label = ``) =>
        `${label}${type} diagnostics not found for "${message}"`,
    diagnosticsUnsupportedSeverity: (type: string, severity: string, label = ``) =>
        `${label}unsupported @${type}-[severity]: "${severity}"`,
    diagnosticsLocationMismatch: (type: string, message: string, label = ``) =>
        `${label}expected "@${type}-[severity] "${message}" to be reported in location, but got it somewhere else`,
    diagnosticsWordMismatch: (type: string, expectedWord: string, message: string, label = ``) =>
        `${label}expected word in "@${type}-[severity] word:${expectedWord} ${message}" to be found, but it wasn't`,
    diagnosticsSeverityMismatch: (
        type: string,
        expectedSeverity: string,
        actualSeverity: string,
        message: string,
        label = ``
    ) =>
        `${label}expected ${type} diagnostic "${message}" to be reported with "${expectedSeverity}, but it was reported with "${actualSeverity}"`,
    diagnosticExpectedNotFound: (type: string, message: string, label = ``) =>
        `${label}no ${type} diagnostic found for "${message}"`,
    combine: (errors: string[]) => `\n${errors.join(`\n`)}`,
};
