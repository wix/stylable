import {expect} from 'chai';
import {
    filterChunkNodesByType,
    matchSelectorTarget,
    parseSelector,
    SelectorChunk,
    separateChunks
} from '../src/selector-utils';

describe('Selector Utils', () => {

    const tests: Array<{ title: string, selector: string, expected: SelectorChunk[][] }> = [
        {
            title: 'empty selector',
            selector: '',
            expected: [
                [
                    {type: 'selector', nodes: []}
                ]
            ]
        },
        {
            title: 'class in first chunk',
            selector: '.x',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [
                            {type: 'class', name: 'x'}
                        ]
                    }
                ]
            ]
        },
        {
            title: 'handle spacing',
            selector: '.x .y',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [
                            {type: 'class', name: 'x'}
                        ]
                    },
                    {
                        type: 'spacing',
                        nodes: [
                            {type: 'class', name: 'y'}
                        ]
                    }
                ]
            ]
        },
        {
            title: 'handle operator',
            selector: '.x + .y',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [
                            {type: 'class', name: 'x'}
                        ]
                    },
                    {
                        type: 'operator',
                        operator: '+',
                        nodes: [
                            {type: 'class', name: 'y'}
                        ]
                    }
                ]
            ]
        },
        {
            title: 'handle multiple selector',
            selector: '.x, .y',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [
                            {type: 'class', name: 'x'}
                        ]
                    }
                ],
                [
                    {
                        type: 'selector',
                        nodes: [
                            {type: 'class', name: 'y'}
                        ]
                    }
                ]
            ]
        },
        {
            title: 'handle chunks with several nodes',
            selector: '.x, .y::z',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [
                            {type: 'class', name: 'x'}
                        ]
                    }
                ],
                [
                    {
                        type: 'selector',
                        nodes: [
                            {type: 'class', name: 'y'},
                            {type: 'pseudo-element', name: 'z'}
                        ]
                    }
                ]
            ]
        },
        {
            title: 'handle 2 selectors',
            selector: '.x.y',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [
                            {type: 'class', name: 'x'},
                            {type: 'class', name: 'y'}
                        ]
                    }
                ]
            ]
        }
    ];

    describe('separateChunks', () => {
        tests.forEach(test => {
            it(test.title, () => {
                expect(separateChunks(parseSelector(test.selector))).to.eql(test.expected);
            });
        });

    });

    describe('matchSelectorTarget', () => {
        it('should return true if requesting selector is contained in target selector', () => {
            expect(matchSelectorTarget('.menu::button', '.x .menu:hover::button'), '1').to.equal(true);
            expect(matchSelectorTarget('.x .menu::button', '.menu::button::hover'), '2').to.equal(false);

            expect(matchSelectorTarget('.menu::button', '.button'), '3').to.equal(false);
            expect(matchSelectorTarget('.menu::button', '.menu'), '4').to.equal(false);
            expect(matchSelectorTarget('.menu', '.menu::button'), '5').to.equal(false);
        });

        it('should not match empty requested selector in emptyly', () => {
            expect(matchSelectorTarget('', '.menu::button')).to.equal(false);
        });

        it('should compare node types when comparing', () => {
            expect(matchSelectorTarget('.x::y', '.x::y'), '1').to.equal(true);
            expect(matchSelectorTarget('.x::y', '.x.y'), '2').to.equal(false);
            expect(matchSelectorTarget('.a::a', '.a.a'), '3').to.equal(false);
            expect(matchSelectorTarget('.a::a', '.a::a'), '4').to.equal(true);
        });

        it('should support multiple compound selectors', () => {
            expect(matchSelectorTarget('.x', '.y,.x')).to.equal(true);
            expect(matchSelectorTarget('.x', '.y,.z')).to.equal(false);
        });

        it('should regard order', () => {
            expect(matchSelectorTarget('.x::y', '.y::x')).to.equal(false);
        });

        it('should not match if end is different', () => {
            expect(matchSelectorTarget('.x::y::z', '.x::y::k')).to.equal(false);
        });

        it('should group by classes', () => {
            expect(matchSelectorTarget('.x::y', '.x::y.z'), '1').to.equal(true);
            expect(matchSelectorTarget('.x::y', '.x::y::z'), '2').to.equal(false);
            expect(matchSelectorTarget('.x', '.x.z'), '3').to.equal(true);
        });

        it('should filter duplicate classes', () => {
            expect(matchSelectorTarget('.x.x::y.z', '.x::y.z'), '1').to.equal(true);
            expect(matchSelectorTarget('.x::y.x.z', '.x::y.z'), '2').to.equal(true);
            expect(matchSelectorTarget('.x::y.x.x.x::z.z', '.x::y'), '3').to.equal(false);
            expect(matchSelectorTarget('.x.x.x::y.z', '.x::y.z'), '4').to.equal(true);
        });
    });

    describe('filterChunkNodesByType', () => {
        it('should filter selector nodes by type', () => {
            expect(filterChunkNodesByType({nodes: [{name: '0', type: 'a'}], type: 'dont-care'}, ['a'])).to.eql([{
                name: '0',
                type: 'a'
            }]);
            expect(filterChunkNodesByType({
                nodes: [{name: '0', type: 'a'}, {name: '1', type: 'b'}, {name: '2', type: 'c'}],
                type: 'dont-care'
            }, ['b', 'a'])).to.eql([{name: '0', type: 'a'}, {name: '1', type: 'b'}]);
        });
    });
});
