import { expect } from 'chai';
import { CSSClass } from '@stylable/core/dist/features';

describe('CSS class -st-extends parsing', () => {
    it('should parse type extends', () => {
        expect(CSSClass.parseStExtends('Button').types).to.eql([
            { args: null, symbolName: 'Button' },
        ]);
    });

    it('should parse function extends with no arguments', () => {
        expect(CSSClass.parseStExtends('Button()').types).to.eql([
            { args: [], symbolName: 'Button' },
        ]);
    });

    it('should parse type extends with value arguments separated by comma', () => {
        expect(CSSClass.parseStExtends('Button(1px solid, red)').types).to.eql([
            {
                args: [
                    [
                        { type: 'word', value: '1px' },
                        { type: 'space', value: ' ' },
                        { type: 'word', value: 'solid' },
                    ],
                    [{ type: 'word', value: 'red' }],
                ],
                symbolName: 'Button',
            },
        ]);
    });

    it('should parse multiple extends separated by space', () => {
        expect(CSSClass.parseStExtends('Button(1px solid, red) Mixin').types).to.eql([
            {
                args: [
                    [
                        { type: 'word', value: '1px' },
                        { type: 'space', value: ' ' },
                        { type: 'word', value: 'solid' },
                    ],
                    [{ type: 'word', value: 'red' }],
                ],
                symbolName: 'Button',
            },
            {
                args: null,
                symbolName: 'Mixin',
            },
        ]);
    });
});
