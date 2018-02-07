import { expect } from 'chai';
import * as postcss from 'postcss';
import { parseSelector, SelectorChunk, separateChunks } from '../src/selector-utils';

describe('Selector Utils', () => {

    const tests: Array<{ title: string, selector: string, expected: SelectorChunk[][] }> = [
        {
            title: 'empty selector',
            selector: '',
            expected: [
                [
                    { type: 'selector', nodes: [] }
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
                            { type: 'class', name: 'x' }
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
                            { type: 'class', name: 'x' }
                        ]
                    },
                    {
                        type: 'spacing',
                        nodes: [
                            { type: 'class', name: 'y' }
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
                            { type: 'class', name: 'x' }
                        ]
                    },
                    {
                        type: 'operator',
                        operator: '+',
                        nodes: [
                            { type: 'class', name: 'y' }
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

});

// what about nested-pseudo-classes?
// handle multiple selector on target

// a = separateChunks(requstingSelector)
// b = separateChunks(currentSelector)

// b.forEach((ib)=>{

    // la = getLastChunk(a)
    // lb = getLastChunk(ib)
    
    // rla = filterByType(la, [class element pseudo-element])
    // rlb = filterByType(lb, [class element pseudo-element])
    
    // rlb.isContains(rla);
// })
