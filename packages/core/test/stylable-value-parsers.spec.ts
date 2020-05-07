import { expect } from 'chai';
import postcss from 'postcss';
import { SBTypesParsers, valueMapping } from '../src/stylable-value-parsers';

const parseMixin = (mixinValue: string) => {
    return SBTypesParsers[valueMapping.mixin](postcss.decl({ value: mixinValue }), () => 'named');
};

describe('stylable-value-parsers', () => {
    it('named arguments with no params', () => {
        expect(parseMixin('Button')).to.eql([{ type: 'Button', options: {} }]);
    });

    it('named arguments with empty params', () => {
        expect(parseMixin('Button()')).to.eql([{ type: 'Button', options: {} }]);
    });

    it('named arguments with one simple param', () => {
        expect(parseMixin('Button(color red)')).to.eql([
            { type: 'Button', options: { color: 'red' } },
        ]);
    });

    it('named arguments with two simple params', () => {
        expect(parseMixin('Button(color red, color2 green)')).to.eql([
            {
                type: 'Button',
                options: { color: 'red', color2: 'green' },
            },
        ]);
    });

    it('named arguments with a trailing comma', () => {
        expect(parseMixin('Button(color red,)')).to.eql([
            {
                type: 'Button',
                options: { color: 'red' },
            },
        ]);
    });

    it('multiple named arguments with a trailing comma', () => {
        expect(parseMixin('Button(color red, size 2px,)')).to.eql([
            {
                type: 'Button',
                options: { color: 'red', size: '2px' },
            },
        ]);
    });

    it('named arguments with one param with spaces', () => {
        expect(parseMixin('Button(border 1px solid red)')).to.eql([
            {
                type: 'Button',
                options: { border: '1px solid red' },
            },
        ]);
    });
});
