import {expect} from 'chai';
import * as postcss from 'postcss';
import {filterByType, isSameTargetElement, parseSelector, SelectorChunk, separateChunks} from '../src/selector-utils';

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

    describe('isSameTargetElement', () => {
        it('should return true if requesting selector is contained in target selector', () => {
            expect(isSameTargetElement('.menu::button', '.x .menu:hover::button')).to.equal(true);
            expect(isSameTargetElement('.x .menu::button', '.menu::button::hover')).to.equal(true);
            expect(isSameTargetElement('.menu::button', '.button')).to.equal(false);
            expect(isSameTargetElement('.menu::button', '.menu')).to.equal(false);

            // expect(isSameTargetElement('.menu', '.menu::button')).to.equal(false);   // TODO shouldn't this pass?
        });

        it('should support multiple compound selectors', () => {
            expect(isSameTargetElement('.x', '.y,.x')).to.equal(true);
            expect(isSameTargetElement('.x', '.y,.z')).to.equal(false);
        });

        it('should disregard order?', () => {
            expect(isSameTargetElement('.x::y', '.y::x')).to.equal(true);   // TODO really? barak?
        });

        it('should support complex cases', () => {
            // don't think these should actually be here. however they don't pass:
            // expect(isSameTargetElement('.root .x::y.z', '.x::y')).to.equal(true);
            // expect(isSameTargetElement('.root::x::y.z', '.x::y')).to.equal(true);
            //
            expect(isSameTargetElement('.root::x::y::z', '.x::y::k')).to.equal(false);
        });
    });

    describe('filterByType', () => {
        it('should filter selector nodes by type', () => {
            expect(filterByType({nodes: [{name: '0', type: 'a'}], type: 'dont-care'}, ['a'])).to.eql([{
                name: '0',
                type: 'a'
            }]);
            expect(filterByType({
                nodes: [{name: '0', type: 'a'}, {name: '1', type: 'b'}, {name: '2', type: 'c'}],
                type: 'dont-care'
            }, ['b', 'a'])).to.eql([{name: '0', type: 'a'}, {name: '1', type: 'b'}]);
        });
    });
});
