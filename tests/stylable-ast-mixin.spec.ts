import { expect } from 'chai';
import * as postcss from 'postcss';
import { safeParse } from '../src/parser';
import { StylableMeta } from '../src/stylable-processor';
import { StylableTransformer } from '../src/stylable-transformer';
import { createSubsetAst, scopeSelector } from '../src/stylable-utils';
import { valueMapping } from '../src/stylable-value-parsers';
import { createTransformer } from './utils/generate-test-util';

describe('scopeSelector', () => {
    const tests = [
        {
            root: '.a',
            child: '.x',
            selector: '.a .x'
        },
        {
            root: '.a',
            child: '.x:hover',
            selector: '.a .x:hover'
        },
        {
            root: '.a',
            child: '&',
            selector: '.a'
        },
        {
            root: '.a:hover',
            child: '&',
            selector: '.a:hover'
        },
        {
            root: '.a.x',
            child: '&',
            selector: '.a.x'
        },
        {
            root: '.a.x .b:hover',
            child: '&',
            selector: '.a.x .b:hover'
        },
        {
            root: '.a',
            child: '&.x',
            selector: '.a.x'
        },
        {
            root: '.a',
            child: '&.x .y',
            selector: '.a.x .y'
        },
        {
            root: '.a .b',
            child: '&.x .y',
            selector: '.a .b.x .y'
        },
        {
            root: '.a',
            child: '& &',
            selector: '.a .a'
        },
        {
            root: '.a, .b',
            child: '& & &',
            selector: '.a .a .a, .b .b .b'
        },
        {
            root: '.a:hover, .b:focus',
            child: '& & &',
            selector: '.a:hover .a:hover .a:hover, .b:focus .b:focus .b:focus'
        }
    ];

    tests.forEach(test => {
        const _it = (test as any).only ? it.only : it;
        _it(`apply "${test.root}" on "${test.child}" should output "${test.selector}"`, () => {
            const res = scopeSelector(test.root, test.child);
            expect(res.selector).to.equal(test.selector);
        });
    });

});

describe('createSubsetAst', () => {

    function testMatcher(expected: any[], actualNodes: any[]) {
        expected.forEach((expectedMatch, i) => {
            const { nodes, ...match } = expectedMatch;
            const actual = actualNodes[i];
            expect(actual).to.contain(match);
            if (nodes) {
                testMatcher(nodes, actual.nodes);
            }
        });
        expect(actualNodes.length).to.equal(expected.length);
    }

    it('should extract all selectors that has given prefix in the first chunk', () => {

        const res = createSubsetAst(safeParse(`
            .i .x{}
            .i::x{}
            .i[data]{}
            .i:hover{}
            .x,.i{}
            .i,.x{}
            .i.x{}
            .x.i{}

            /*more complex*/
            .x.y::i.z:hover.i{}
            .x,.i:hover .y{}
            .i .y,.x{}
            .i:not(.x){}
            .i .x:hover.i{}
            .x.i.y{}

            .i.i{}

            /*extracted as decl on root*/
            .i{color: red}

            /*not extracted*/
            .x .i{}
            :not(.i) .i{}
        `), '.i');

        const expected = [
            { selector: '& .x' },
            { selector: '&::x' },
            { selector: '&[data]' },
            { selector: '&:hover' },
            { selector: '&' },
            { selector: '&' },
            { selector: '&.x' },
            { selector: '&.x' },
            { selector: '&.x.y::i.z:hover' },
            { selector: '&:hover .y' },
            { selector: '& .y' },
            { selector: '&:not(.x)' },
            { selector: '& &.x:hover' },
            { selector: '&.x.y' },
            { selector: '&&' }, // TODO: check if possible
            { selector: '&' }
        ];

        testMatcher(expected, res.nodes!);

    });

    it('should parts under @media', () => {

        const res = createSubsetAst(safeParse(`
            .i {color: red}
            .i:hover {}
            @media (max-width: 300px) {
                .i {}
                .i:hover {}
            }
        `), '.i');

        const expected = [
            { selector: '&' },
            { selector: '&:hover' },
            {
                type: 'atrule',
                params: '(max-width: 300px)',
                nodes: [
                    { selector: '&' },
                    { selector: '&:hover' }
                ]
            }
        ];

        testMatcher(expected, res.nodes!);

    });

    it('should not append empty media', () => {

        const res = createSubsetAst(safeParse(`
            .i {}
            @media (max-width: 300px) {
                .x {}
            }
        `), '.i');

        const expected = [
            { selector: '&' }
        ];

        testMatcher(expected, res.nodes!);

    });
});
