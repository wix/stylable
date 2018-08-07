import { expect } from 'chai';
import * as postcss from 'postcss';
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
        expect(parseMixin('Button(color 1px)')).to.eql([{ type: 'Button', options: { color: '1px' } }]);
    });

    it('named arguments with two simple params', () => {
        expect(parseMixin('Button(color 1px, color2 2px)')).to.eql([{
            type: 'Button',
            options: { color: '1px', color2: '2px' }
        }]);
    });

    it('named arguments with one param with spaces', () => {
        expect(parseMixin('Button(color 1px solid red)')).to.eql([{
            type: 'Button',
            options: { color: '1px solid red' }
        }]);
    });
});
