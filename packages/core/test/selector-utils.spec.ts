import { expect } from 'chai';
import {
    filterChunkNodesByType,
    parseSelector,
    SelectorChunk,
    separateChunks,
} from '@stylable/core';

describe('Selector Utils', () => {
    const seperateChunksTestVectors: Array<{
        title: string;
        selector: string;
        expected: SelectorChunk[][];
    }> = [
        {
            title: 'empty selector',
            selector: '',
            expected: [[{ type: 'selector', nodes: [] }]],
        },
        {
            title: 'class in first chunk',
            selector: '.x',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [{ type: 'class', name: 'x' }],
                    },
                ],
            ],
        },
        {
            title: 'handle spacing',
            selector: '.x .y',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [{ type: 'class', name: 'x' }],
                    },
                    {
                        type: 'spacing',
                        value: ' ',
                        nodes: [{ type: 'class', name: 'y' }],
                    },
                ],
            ],
        },
        {
            title: 'handle operator',
            selector: '.x + .y',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [{ type: 'class', name: 'x' }],
                    },
                    {
                        type: 'operator',
                        operator: '+',
                        nodes: [{ type: 'class', name: 'y' }],
                    },
                ],
            ],
        },
        {
            title: 'handle multiple selector',
            selector: '.x, .y',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [{ type: 'class', name: 'x' }],
                    },
                ],
                [
                    {
                        type: 'selector',
                        nodes: [{ type: 'class', name: 'y' }],
                    },
                ],
            ],
        },
        {
            title: 'handle chunks with several nodes',
            selector: '.x, .y::z',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [{ type: 'class', name: 'x' }],
                    },
                ],
                [
                    {
                        type: 'selector',
                        nodes: [
                            { type: 'class', name: 'y' },
                            { type: 'pseudo-element', name: 'z' },
                        ],
                    },
                ],
            ],
        },
        {
            title: 'handle 2 selectors',
            selector: '.x.y',
            expected: [
                [
                    {
                        type: 'selector',
                        nodes: [
                            { type: 'class', name: 'x' },
                            { type: 'class', name: 'y' },
                        ],
                    },
                ],
            ],
        },
    ];

    describe('separateChunks', () => {
        seperateChunksTestVectors.forEach((test) => {
            it(test.title, () => {
                expect(separateChunks(parseSelector(test.selector))).to.eql(test.expected);
            });
        });
    });

    describe('filterChunkNodesByType', () => {
        it('should filter and return only selector nodes which match types specified in array', () => {
            expect(
                filterChunkNodesByType({ nodes: [{ name: '0', type: 'a' }], type: 'dont-care' }, [
                    'a',
                ])
            ).to.eql([
                {
                    name: '0',
                    type: 'a',
                },
            ]);
            expect(
                filterChunkNodesByType(
                    {
                        nodes: [
                            { name: '0', type: 'a' },
                            { name: '1', type: 'b' },
                            { name: '2', type: 'c' },
                        ],
                        type: 'dont-care',
                    },
                    ['b', 'a']
                )
            ).to.eql([
                { name: '0', type: 'a' },
                { name: '1', type: 'b' },
            ]);
        });
    });
});
