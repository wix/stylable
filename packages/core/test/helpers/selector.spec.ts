import { expect } from 'chai';
import {
    scopeNestedSelector,
    parseSelector,
    isSimpleSelector,
} from '@stylable/core/dist/helpers/selector';

describe(`helpers/selector`, () => {
    describe(`scopeNestedSelector`, () => {
        const tests: Array<{
            label: string;
            scope: string;
            nested: string;
            expected: string;
            only?: boolean;
        }> = [
            {
                label: '+ no nesting selector',
                scope: '.a',
                nested: '.x',
                expected: '.a .x',
            },
            {
                label: '+ complex selector with no nesting selector',
                scope: '.a',
                nested: '.x:hover',
                expected: '.a .x:hover',
            },
            {
                label: '+ nesting selector',
                scope: '.a',
                nested: '&',
                expected: '.a',
            },
            {
                label: 'compound scope + nesting selector',
                scope: '.a:hover',
                nested: '&',
                expected: '.a:hover',
            },
            {
                label: 'compound scope + nesting selector (2)',
                scope: '.a.x',
                nested: '&',
                expected: '.a.x',
            },
            {
                label: 'complex scope + nesting selector',
                scope: '.a.x .b:hover',
                nested: '&',
                expected: '.a.x .b:hover',
            },
            {
                label: '+ nesting selector with compound class',
                scope: '.a',
                nested: '&.x',
                expected: '.a.x',
            },
            {
                label: '+ nesting selector with complex class',
                scope: '.a',
                nested: '&.x .y',
                expected: '.a.x .y',
            },
            {
                label: 'complex scope + nesting selector with complex class',
                scope: '.a .b',
                nested: '&.x .y',
                expected: '.a .b.x .y',
            },
            {
                label: '+ multiple nesting selector',
                scope: '.a',
                nested: '& &',
                expected: '.a .a',
            },
            {
                label: 'multi scopes + multiple nesting selectors',
                scope: '.a, .b',
                nested: '& & &',
                expected: '.a .a .a, .b .b .b',
            },
            {
                label: 'multi compound scopes + multi nesting selector',
                scope: '.a:hover, .b:focus',
                nested: '& & &',
                expected: '.a:hover .a:hover .a:hover, .b:focus .b:focus .b:focus',
            },
            {
                label: '+ global before',
                scope: '.a',
                nested: ':global(.x) &',
                expected: ':global(.x) .a',
            },
            {
                label: '+ nested nesting selector',
                scope: '.a',
                nested: ':not(&)',
                expected: ':not(.a)',
            },
            {
                label: 'multi scopes + nested nesting selector',
                scope: '.a, .b',
                nested: ':not(&)',
                expected: ':not(.a), :not(.b)',
            },
            {
                label: '+ nested deep nesting selector',
                scope: '.a',
                nested: ':not(&, :not(&))',
                expected: ':not(.a, :not(.a))',
            },
            {
                label: '+ nested nth of nesting selector',
                scope: '.a',
                nested: ':nth-child(5n+2 of &)',
                expected: ':nth-child(5n+2 of .a)',
            },
            {
                label: 'nesting scope persists',
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
                    type: `type`,
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
                    type: `type`,
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
