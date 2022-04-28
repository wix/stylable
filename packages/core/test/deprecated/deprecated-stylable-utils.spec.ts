import { expect } from 'chai';
import { scopeSelector } from '@stylable/core/dist/deprecated/deprecated-stylable-utils';

describe('deprecated/selector-utils', () => {
    describe('scopeSelector', () => {
        const tests: Array<{ root: string; child: string; selector: string; only?: boolean }> = [
            {
                root: '.a',
                child: '.x',
                selector: '.a .x',
            },
            {
                root: '.a',
                child: '.x:hover',
                selector: '.a .x:hover',
            },
            {
                root: '.a',
                child: '&',
                selector: '.a',
            },
            {
                root: '.a:hover',
                child: '&',
                selector: '.a:hover',
            },
            {
                root: '.a.x',
                child: '&',
                selector: '.a.x',
            },
            {
                root: '.a.x .b:hover',
                child: '&',
                selector: '.a.x .b:hover',
            },
            {
                root: '.a',
                child: '&.x',
                selector: '.a.x',
            },
            {
                root: '.a',
                child: '&.x .y',
                selector: '.a.x .y',
            },
            {
                root: '.a .b',
                child: '&.x .y',
                selector: '.a .b.x .y',
            },
            {
                root: '.a',
                child: '& &',
                selector: '.a .a',
            },
            {
                root: '.a, .b',
                child: '& & &',
                selector: '.a .a .a, .b .b .b',
            },
            {
                root: '.a:hover, .b:focus',
                child: '& & &',
                selector: '.a:hover .a:hover .a:hover, .b:focus .b:focus .b:focus',
            },
            {
                root: '.a',
                child: ':global(.x) &',
                selector: ':global(.x) .a',
            },
        ];

        for (const { only, root, selector, child } of tests) {
            const test = only ? it.only : it;
            test(`apply "${root}" on "${child}" should output "${selector}"`, () => {
                const res = scopeSelector(root, child);
                expect(res.selector).to.equal(selector);
            });
        }
    });
});
