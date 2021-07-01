import { expect } from 'chai';
import { scopeNestedSelector, parseSelector } from '@stylable/core/dist/helpers/selector';

describe(`helpers/selector`, () => {
    describe(`scopeNestedSelector`, () => {
        const tests: Array<{ scope: string; nested: string; expected: string; only?: boolean }> = [
            {
                scope: '.a',
                nested: '.x',
                expected: '.a .x',
            },
            {
                scope: '.a',
                nested: '.x:hover',
                expected: '.a .x:hover',
            },
            {
                scope: '.a',
                nested: '&',
                expected: '.a',
            },
            {
                scope: '.a:hover',
                nested: '&',
                expected: '.a:hover',
            },
            {
                scope: '.a.x',
                nested: '&',
                expected: '.a.x',
            },
            {
                scope: '.a.x .b:hover',
                nested: '&',
                expected: '.a.x .b:hover',
            },
            {
                scope: '.a',
                nested: '&.x',
                expected: '.a.x',
            },
            {
                scope: '.a',
                nested: '&.x .y',
                expected: '.a.x .y',
            },
            {
                scope: '.a .b',
                nested: '&.x .y',
                expected: '.a .b.x .y',
            },
            {
                scope: '.a',
                nested: '& &',
                expected: '.a .a',
            },
            {
                scope: '.a, .b',
                nested: '& & &',
                expected: '.a .a .a, .b .b .b',
            },
            {
                scope: '.a:hover, .b:focus',
                nested: '& & &',
                expected: '.a:hover .a:hover .a:hover, .b:focus .b:focus .b:focus',
            },
            {
                scope: '.a',
                nested: ':global(.x) &',
                expected: ':global(.x) .a',
            },
            {
                scope: '.a',
                nested: ':not(&)',
                expected: '.a :not(.a)',
            },
            {
                scope: '&',
                nested: '.no-parent-re-scoping',
                expected: '& .no-parent-re-scoping',
            },
        ];

        for (const { only, scope, expected, nested } of tests) {
            const test = only ? it.only : it;
            test(`apply "${scope}" on "${nested}" should output "${expected}"`, () => {
                const { selector } = scopeNestedSelector(
                    parseSelector(scope),
                    parseSelector(nested)
                );
                expect(selector).to.equal(expected);
            });
        }
    });
});
