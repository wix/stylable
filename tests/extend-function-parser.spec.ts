import { expect } from 'chai';
import { SBTypesParsers, valueMapping } from '../src/stylable-value-parsers';

const parseExtends = SBTypesParsers[valueMapping.extends];

describe('SBTypesParsers.extends', () => {

    it('should parse type extends', () => {
        expect(parseExtends('Button').types).to.eql([
            { args: null, symbolName: 'Button' }
        ]);
    });

    it('should parse function extends with no arguments', () => {
        expect(parseExtends('Button()').types).to.eql([
            { args: [], symbolName: 'Button' }
        ]);
    });

    it('should parse type extends with value arguments separated by comma', () => {

        expect(parseExtends('Button(1px solid, red)').types).to.eql([
            {
                args: [
                    [
                        { type: 'word', value: '1px' },
                        { type: 'space', value: ' ' },
                        { type: 'word', value: 'solid' }
                    ],
                    [
                        { type: 'word', value: 'red' }
                    ]
                ],
                symbolName: 'Button'
            }
        ]);
    });

    it('should parse multiple extends separated by space', () => {

        expect(parseExtends('Button(1px solid, red) Mixin').types).to.eql([
            {
                args: [
                    [
                        { type: 'word', value: '1px' },
                        { type: 'space', value: ' ' },
                        { type: 'word', value: 'solid' }
                    ],
                    [
                        { type: 'word', value: 'red' }
                    ]
                ],
                symbolName: 'Button'
            },
            {
                args: null,
                symbolName: 'Mixin'
            }
        ]);
    });

});
