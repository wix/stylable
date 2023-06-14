import { expect } from 'chai';
import { createSubsetAst } from '@stylable/core/dist/helpers/rule';
import { cssParse } from '@stylable/core/dist/index-internal';

describe(`helpers/rule`, () => {
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
            const res = createSubsetAst(
                cssParse(`
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

                /*nested selectors*/
                :not(.i) .i{}
                :nth-child(5n - 1 of .i) {}
                :nth-child(5n - 2 of .i, .i) {}
                :nth-child(5n - 3 of .i, .x, .i) {}

                /*extracted as decl on root*/
                .i{color: red}

                /*not extracted*/
                .x .i{}

                /*nesting*/
                .i[out] { .i[in] {} }
            `),
                '.i'
            );

            const expected = [
                { selector: '[st-mixin-marker] .x' },
                { selector: '[st-mixin-marker]::x' },
                { selector: '[st-mixin-marker][data]' },
                { selector: '[st-mixin-marker]:hover' },
                { selector: '[st-mixin-marker]' },
                { selector: '[st-mixin-marker]' },
                { selector: '[st-mixin-marker].x' },
                { selector: '[st-mixin-marker].x' },
                { selector: '[st-mixin-marker].x.y::i.z:hover' },
                { selector: '[st-mixin-marker]:hover .y' },
                { selector: '[st-mixin-marker] .y' },
                { selector: '[st-mixin-marker]:not(.x)' },
                { selector: '[st-mixin-marker] [st-mixin-marker].x:hover' },
                { selector: '[st-mixin-marker].y.x' },
                { selector: '[st-mixin-marker][st-mixin-marker]' }, // TODO: check if possible
                { selector: ':not([st-mixin-marker]) [st-mixin-marker]' },
                { selector: ':nth-child(5n - 1 of [st-mixin-marker])' },
                { selector: ':nth-child(5n - 2 of [st-mixin-marker], [st-mixin-marker])' },
                { selector: ':nth-child(5n - 3 of [st-mixin-marker], .x, [st-mixin-marker])' }, // ToDo: check if to remove unrelated nested selectors
                { selector: '[st-mixin-marker]' },
                {
                    selector: '[st-mixin-marker][out]',
                    nodes: [{ selector: '[st-mixin-marker][in]' }],
                },
            ];

            testMatcher(expected, res.nodes);
        });

        it('should extract global when creating root chunk', () => {
            const res = createSubsetAst(
                cssParse(`
                :global(.x){}
                :global(.x) .root{}
            `),
                '.root',
                undefined,
                true
            );

            const expected = [
                { selector: ':global(.x)' },
                { selector: ':global(.x) [st-mixin-marker]' },
            ];

            testMatcher(expected, res.nodes);
        });

        it('should parts under @media', () => {
            const res = createSubsetAst(
                cssParse(`
                .i {color: red}
                .i:hover {}
                @media (max-width: 300px) {
                    .i {}
                    .i:hover {}
                }
            `),
                '.i'
            );

            const expected = [
                { selector: '[st-mixin-marker]' },
                { selector: '[st-mixin-marker]:hover' },
                {
                    type: 'atrule',
                    params: '(max-width: 300px)',
                    nodes: [
                        { selector: '[st-mixin-marker]' },
                        { selector: '[st-mixin-marker]:hover' },
                    ],
                },
            ];

            testMatcher(expected, res.nodes);
        });

        it('should not append empty media', () => {
            const res = createSubsetAst(
                cssParse(`
                .i {}
                @media (max-width: 300px) {
                    .x {}
                }
            `),
                '.i'
            );

            const expected = [{ selector: '[st-mixin-marker]' }];

            testMatcher(expected, res.nodes);
        });
    });
});
