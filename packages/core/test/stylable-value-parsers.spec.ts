import { expect } from 'chai';
import * as postcss from 'postcss';
import { SBTypesParsers, valueMapping } from '@stylable/core';
import postcssValueParser from 'postcss-value-parser';

const parseMixin = (mixinValue: string) => {
    const mix = SBTypesParsers[valueMapping.mixin](
        postcss.decl({ prop: '', value: mixinValue }),
        () => 'named'
    );
    mix.forEach((m) => {
        delete m.originDecl;
    });
    return mix;
};

const parsePartialMixin = (mixinValue: string) => {
    const mix = SBTypesParsers[valueMapping.partialMixin](
        postcss.decl({ prop: valueMapping.partialMixin, value: mixinValue }),
        () => 'named'
    );
    mix.forEach((m) => {
        delete m.originDecl;
    });
    return mix;
};

describe('stylable-value-parsers', () => {
    describe('-st-mixin', () => {
        it('named arguments with no params', () => {
            expect(parseMixin('Button')).to.eql([
                { type: 'Button', options: {}, valueNode: postcssValueParser('Button').nodes[0] },
            ]);
        });

        it('named arguments with empty params', () => {
            expect(parseMixin('Button()')).to.eql([
                { type: 'Button', options: {}, valueNode: postcssValueParser('Button()').nodes[0] },
            ]);
        });

        it('named arguments with one simple param', () => {
            expect(parseMixin('Button(color red)')).to.eql([
                {
                    type: 'Button',
                    options: { color: 'red' },
                    valueNode: postcssValueParser('Button(color red)').nodes[0],
                },
            ]);
        });

        it('named arguments with two simple params', () => {
            expect(parseMixin('Button(color red, color2 green)')).to.eql([
                {
                    type: 'Button',
                    options: { color: 'red', color2: 'green' },
                    valueNode: postcssValueParser('Button(color red, color2 green)').nodes[0],
                },
            ]);
        });

        it('named arguments with a trailing comma', () => {
            expect(parseMixin('Button(color red,)')).to.eql([
                {
                    type: 'Button',
                    options: { color: 'red' },
                    valueNode: postcssValueParser('Button(color red,)').nodes[0],
                },
            ]);
        });

        it('multiple named arguments with a trailing comma', () => {
            expect(parseMixin('Button(color red, size 2px,)')).to.eql([
                {
                    type: 'Button',
                    options: { color: 'red', size: '2px' },
                    valueNode: postcssValueParser('Button(color red, size 2px,)').nodes[0],
                },
            ]);
        });

        it('named arguments with one param with spaces', () => {
            expect(parseMixin('Button(border 1px solid red)')).to.eql([
                {
                    type: 'Button',
                    options: { border: '1px solid red' },
                    valueNode: postcssValueParser('Button(border 1px solid red)').nodes[0],
                },
            ]);
        });
    });

    it('partial mixin annotation', () => {
        expect(parsePartialMixin('Button(border 1px solid red)')).to.eql([
            {
                type: 'Button',
                options: { border: '1px solid red' },
                partial: true,
                valueNode: postcssValueParser('Button(border 1px solid red)').nodes[0],
            },
        ]);
    });
});
