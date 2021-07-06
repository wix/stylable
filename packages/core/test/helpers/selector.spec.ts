import { expect } from 'chai';
import {
    scopeNestedSelector,
    parseSelector,
    isSimpleSelector,
} from '@stylable/core/dist/helpers/selector';

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
    describe(`isSimpleSelector`, () => {
        it(`should return simple for class selector`, () => {
            const result = isSimpleSelector(`.a`);

            expect(result).to.eql([
                {
                    isSimple: true,
                    type: `class`,
                },
            ]);
        });
        it(`should return simple for element selector`, () => {
            const result = isSimpleSelector(`e`);

            expect(result).to.eql([
                {
                    isSimple: true,
                    type: `element`,
                },
            ]);
        });
        it(`should return result for multiple selectors`, () => {
            const result = isSimpleSelector(`.a, e`);

            expect(result).to.eql([
                {
                    isSimple: true,
                    type: `class`,
                },
                {
                    isSimple: true,
                    type: `element`,
                },
            ]);
        });
        it(`should return complex for multiple classes `, () => {
            const result = isSimpleSelector(`.a.b`);

            expect(result).to.eql([
                {
                    isSimple: false,
                    type: `complex`,
                },
            ]);
        });
        it(`should return complex for class and element combination`, () => {
            const result = isSimpleSelector(`e.b`);

            expect(result).to.eql([
                {
                    isSimple: false,
                    type: `complex`,
                },
            ]);
        });
        it(`should return complex for class or element with function`, () => {
            const result = isSimpleSelector(`e(), .b()`);

            expect(result).to.eql([
                {
                    isSimple: false,
                    type: `complex`,
                },
                {
                    isSimple: false,
                    type: `complex`,
                },
            ]);
        });
        it(`should return complex for any other selector`, () => {
            const result = isSimpleSelector(`[], #id, :state, ::element`);

            expect(result).to.eql([
                {
                    isSimple: false,
                    type: `complex`,
                },
                {
                    isSimple: false,
                    type: `complex`,
                },
                {
                    isSimple: false,
                    type: `complex`,
                },
                {
                    isSimple: false,
                    type: `complex`,
                },
            ]);
        });
        it(`should return no value for empty selector`, () => {
            const result = isSimpleSelector(``);

            expect(result).to.eql([]);
        });
    });
});
