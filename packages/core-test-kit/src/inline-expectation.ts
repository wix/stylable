import { matchDiagnostic } from './diagnostics';
import type { Diagnostic, StylableMeta } from '@stylable/core';
import type * as postcss from 'postcss';

interface Test {
    type: TestScopes;
    expectation: string;
    errors: string[];
    hasMissingDiagnostic: boolean;
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
    meta: Pick<
        StylableMeta,
        'source' | 'sourceAst' | 'targetAst' | 'diagnostics' | 'transformDiagnostics'
    >;
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
                  source: '/undefined.st.css',
                  sourceAst: result,
                  targetAst: result,
                  diagnostics: null as unknown as StylableMeta['diagnostics'],
                  transformDiagnostics: null as unknown as StylableMeta['transformDiagnostics'],
              },
          }
        : result;
    const rootAst = context.meta.sourceAst;
    const expectedTestAmount =
        expectedTestInput ??
        (rootAst.toString().match(new RegExp(`${testScopesRegex()}`, `gm`))?.length || 0);
    const checks: Test[] = [];
    const errors: string[] = [];
    // collect checks
    rootAst.walkComments((comment) => {
        const input = comment.text.split(/@/gm);
        const testCommentSrc = comment;
        const testCommentTarget = isDeprecatedInput
            ? comment
            : getTargetComment(context.meta, comment) || comment;
        const nodeTarget = testCommentTarget.next() as AST;
        const nodeSrc = testCommentSrc.next() as AST;
        const isRemoved = isRemovedFromTarget(nodeTarget, nodeSrc);
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
                                hasMissingDiagnostic: false,
                            };
                            errors.push(...result.errors);
                            checks.push(result);
                        } else {
                            const result = tests[testScope](
                                context,
                                testInput.trim(),
                                isRemoved ? undefined : nodeTarget,
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
    if (checks.find((error) => error.hasMissingDiagnostic)) {
        errors.push(testInlineExpectsErrors.diagnosticsDump(context.meta));
    }
    if (errors.length) {
        throw new Error(testInlineExpectsErrors.combine(errors));
    }
    if (expectedTestAmount !== checks.length) {
        throw new Error(testInlineExpectsErrors.matchAmount(expectedTestAmount, checks.length));
    }
}

function checkTest(
    context: Context,
    expectation: string,
    targetNode: AST | undefined,
    srcNode: AST
): Test {
    const type = srcNode?.type || targetNode?.type;
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
                hasMissingDiagnostic: false,
            };
    }
}
function ruleTest(
    context: Context,
    expectation: string,
    targetNode: AST | undefined,
    srcNode: AST
): Test {
    const result: Test = {
        type: `@rule`,
        expectation,
        errors: [],
        hasMissingDiagnostic: false,
    };
    const { msg, ruleIndex, expectedSelector, expectedBody } = expectation.match(
        /(?<msg>\([^)]*\))*(\[(?<ruleIndex>\d+)\])*(?<expectedSelector>[^{}]*)\s*(?<expectedBody>.*)/s
    )!.groups!;
    const prefix = msg ? msg + `: ` : ``;
    if (!targetNode) {
        // ToDo:  maybe support nodes that are removed from target and leaves mixins
        result.errors.push(testInlineExpectsErrors.removedNode(srcNode.type, prefix));
        return result;
    }
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

        if (testNode.selector !== expectedSelector.trim()) {
            result.errors.push(
                testInlineExpectsErrors.selector(expectedSelector.trim(), testNode.selector, prefix)
            );
        }
        if (declarationCheck === `full`) {
            const actualDecl = testNode.nodes
                .filter((x) => x.type !== `comment`)
                .map((x) => x.toString())
                .join(`; `);
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
    } else if (nodeType === `atrule`) {
        // passing null to srcNode as atruleTest doesn't actually requires it.
        // if it would at some point, then its just a matter of searching the rawAst for it.
        return atRuleTest(
            context,
            expectation.replace(`[${ruleIndex}]`, ``),
            testNode,
            null as unknown as AST
        );
    } else {
        // unsupported mixed-in node test
        result.errors.push(testInlineExpectsErrors.unsupportedMixinNode(testNode.type));
    }
    return result;
}
function atRuleTest(
    _context: Context,
    expectation: string,
    targetNode: AST | undefined,
    srcNode: AST
): Test {
    const result: Test = {
        type: `@atrule`,
        expectation,
        errors: [],
        hasMissingDiagnostic: false,
    };
    const { msg, expectedParams } = expectation.match(/(?<msg>\([^)]*\))*(?<expectedParams>.*)/)!
        .groups!;
    if (expectedParams.match(/^\[\d+\]/)) {
        result.errors.push(testInlineExpectsErrors.atRuleMultiTest(expectation));
        return result;
    }
    const prefix = msg ? msg + `: ` : ``;
    if (!targetNode) {
        // ToDo:  maybe support nodes that are removed from target and leaves mixins
        result.errors.push(testInlineExpectsErrors.removedNode(srcNode.type, prefix));
    } else if (targetNode.type === `atrule`) {
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
function declTest(
    _context: Context,
    expectation: string,
    targetNode: AST | undefined,
    srcNode: AST
): Test {
    const result: Test = {
        type: `@decl`,
        expectation,
        errors: [],
        hasMissingDiagnostic: false,
    };
    // eslint-disable-next-line prefer-const
    let { label, prop, colon, value } = expectation.match(
        /(?<label>\([^)]*\))*(?<prop>[^:]*)\s*(?<colon>:?)\s*(?<value>.*)/
    )!.groups!;
    label = label ? label + `: ` : ``;
    prop = prop.trim();
    value = value.trim();
    if (!targetNode) {
        result.errors.push(testInlineExpectsErrors.removedNode(srcNode.type, label));
    } else if (!prop || !colon) {
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
function analyzeTest(
    context: Context,
    expectation: string,
    targetNode: AST | undefined,
    srcNode: AST
): Test {
    return diagnosticTest(`analyze`, context, expectation, targetNode, srcNode);
}
function transformTest(
    context: Context,
    expectation: string,
    targetNode: AST | undefined,
    srcNode: AST
): Test {
    // check node is removed in transformation
    const matchResult = expectation.match(/-remove(?<label>\([^)]*\))?/);
    if (matchResult) {
        const node = srcNode;
        let { label } = matchResult.groups!;
        label = label ? label + `: ` : ``;
        const isRemoved =
            !targetNode ||
            targetNode.source?.start !== srcNode.source?.start ||
            targetNode.source?.end !== srcNode.source?.end;
        return {
            type: `@transform`,
            expectation,
            errors: isRemoved ? [] : [testInlineExpectsErrors.transformRemoved(node.type, label)],
            hasMissingDiagnostic: false,
        };
    }
    // check transform diagnostics
    return diagnosticTest(`transform`, context, expectation, targetNode, srcNode);
}
function diagnosticTest(
    type: `analyze` | `transform`,
    { meta }: Context,
    expectation: string,
    _targetNode: AST | undefined,
    srcNode: AST
): Test {
    const result: Test = {
        type: `@${type}`,
        expectation,
        errors: [],
        hasMissingDiagnostic: false,
    };
    const matchResult = expectation.match(
        /-(?<severity>\w+)(?<label>\([^)]*\))?\s?(?:word\((?<word>[^)]*)\))?\s?(?<message>[\s\S]*)/
    );
    if (!matchResult) {
        result.errors.push(testInlineExpectsErrors.diagnosticsMalformed(type, expectation));
        return result;
    }
    let { label, severity, message, word } = matchResult.groups!;
    label = label ? label + `: ` : ``;
    severity = severity?.trim() || ``;
    message = message?.trim() || ``;
    word = word?.trim() || ``;

    if (!message) {
        result.errors.push(testInlineExpectsErrors.diagnosticsMalformed(type, expectation, label));
        return result;
    }
    // check for diagnostic
    const error = matchDiagnostic(
        type,
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
            expectedNotFound: (...args) => {
                result.hasMissingDiagnostic = true;
                return testInlineExpectsErrors.diagnosticExpectedNotFound(...args);
            },
        }
    );
    if (error) {
        result.errors.push(error);
    }
    return result;
}

function getTargetComment(meta: Context['meta'], { source }: postcss.Comment) {
    let match: postcss.Comment | undefined = undefined;
    if (!meta.targetAst) {
        return;
    }
    meta.targetAst.walkComments((outputComment) => {
        if (
            outputComment.source?.start?.offset === source?.start?.offset &&
            outputComment.source?.end?.offset === source?.end?.offset
        ) {
            match = outputComment;
            return false;
        }
        return;
    });
    return match;
}

function isRemovedFromTarget(target: AST, source: AST) {
    return (
        !target ||
        target.source?.start !== source.source?.start ||
        target.source?.end !== source.source?.end
    );
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
        `Expected "${expectedAmount}" checks to run but "${actualAmount}" were found`,
    unsupportedNode: (testType: string, nodeType: string, label = ``) =>
        `${label}unsupported type "${testType}" for "${nodeType}"`,
    removedNode: (nodeType: string, label = ``) =>
        `${label}fail to check transformation on removed node with type "${nodeType}"`,
    selector: (expectedSelector: string, actualSelector: string, label = ``) =>
        `${label}expected "${actualSelector}" to transform to "${expectedSelector}"`,
    declarations: (expectedDecl: string, actualDecl: string, selector: string, label = ``) =>
        `${label}expected ${selector} to have declaration {${expectedDecl}}, but got {${actualDecl}}`,
    unfoundMixin: (expectInput: string) => `cannot locate mixed-in rule for "${expectInput}"`,
    unsupportedMixinNode: (type: string) => `unsupported mixin expectation of type "${type}"`,
    ruleMalformedDecl: (decl: string, expectInput: string) =>
        `error in expectation "${decl}" of "${expectInput}"`,
    atruleParams: (expectedParams: string, actualParams: string, label = ``) =>
        `${label}expected "${actualParams}" to transform to ${expectedParams}`,
    atRuleMultiTest: (comment: string) => `atrule mixin is not supported: (${comment})`,
    decl: (expected: string, actual: string, label = ``) =>
        `${label}expected "${actual}" to transform to "${expected}"`,
    declMalformed: (expectedProp: string, expectedLabel: string, label = ``) => {
        if (!expectedProp && !expectedLabel) {
            return `${label}malformed declaration expectation, format should be: "prop: value"`;
        } else {
            return `${label}malformed declaration expectation missing prop: "???: ${expectedLabel}"`;
        }
    },
    deprecatedRootInputNotSupported: (expectation: string) =>
        `"${expectation}" is not supported for with the used input, try calling testInlineExpects(generateStylableResults())`,
    transformRemoved: (nodeType: string, label = ``) =>
        `${label} expected ${nodeType} to be removed, but it was kept after transform`,
    diagnosticsMalformed: (type: string, expectation: string, label = ``) =>
        `${label}malformed @${type} expectation "@${type}${expectation}". format should be: "@${type}-[severity] diagnostic message"`,
    diagnosticsNotFound: (type: string, message: string, label = ``) =>
        `${label}${type} diagnostics not found for "${message}"`,
    diagnosticsUnsupportedSeverity: (type: string, severity: string, label = ``) =>
        `${label}unsupported @${type}-[severity]: "${severity}"`,
    diagnosticsLocationMismatch: (type: string, message: string, label = ``) =>
        `${label}expected "@${type}-[severity] "${message}" to be reported in this location, but got it somewhere else`,
    diagnosticsWordMismatch: (type: string, expectedWord: string, message: string, label = ``) =>
        `${label}expected word in "@${type}-[severity] word(${expectedWord}) ${message}" was not found`,
    diagnosticsSeverityMismatch: (
        type: string,
        expectedSeverity: string,
        actualSeverity: string,
        message: string,
        label = ``
    ) =>
        `${label}expected ${type} diagnostic "${message}" to be reported with "${expectedSeverity}", but it was reported with "${actualSeverity}"`,
    diagnosticExpectedNotFound: (type: string, message: string, label = ``) =>
        `${label}no "${type}" diagnostic found for "${message}"`,
    combine: (errors: string[]) => `\n${errors.join(`\n`)}`,
    diagnosticsDump: ({ source, diagnostics, transformDiagnostics }: Context['meta']) => {
        const transformReport = (diagnostics: Diagnostic[]) => {
            return JSON.stringify(
                diagnostics.map((diagnostic) => {
                    const node = diagnostic.node.clone();
                    if ('nodes' in node) {
                        (node as any).nodes = [];
                    }
                    return {
                        ...diagnostic,
                        node: node.toString(),
                    };
                }),
                null,
                2
            );
        };
        const analyzedReports = transformReport(diagnostics.reports);
        const transformReports = transformDiagnostics
            ? transformReport(transformDiagnostics.reports)
            : 'not transformed';

        return [
            `********* Diagnostics DUMP *********`,
            `Diagnostics found in ${source}:`,
            ' - analyze:',
            analyzedReports,
            ' - transform:',
            transformReports,
            '***********************************',
        ].join('\n');
    },
};
