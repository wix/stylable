import type * as postcss from 'postcss';

export function testInlineExpects(
    result: postcss.Root,
    expectedTestsCount = result.toString().match(/@check/gm)!.length
) {
    if (expectedTestsCount === 0) {
        throw new Error('no tests found try to add @check comments before any selector');
    }
    const checks: Array<[string, string]> = [];

    result.walkRules((rule) => {
        const p = rule.prev();
        if (p && p.type === 'comment') {
            const m = p.text.match(/@check\s+(.*)/);
            if (m) {
                checks.push([rule.selector, m[1]]);
            }
        }
    });
    const errors: string[] = [];
    checks.forEach(([a, b]) => {
        if (a !== b) {
            errors.push(`expected ${a} to transform to ${b}`);
        }
    });
    if (errors.length) {
        throw new Error(errors.join('\n'));
    }
    if (expectedTestsCount !== checks.length) {
        throw new Error(
            `Expected ${expectedTestsCount} checks to run but there was ${checks.length}`
        );
    }
}
