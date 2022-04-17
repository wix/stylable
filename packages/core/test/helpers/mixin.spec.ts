import { expect } from 'chai';
import * as postcss from 'postcss';
import { SBTypesParsers, valueMapping } from '@stylable/core';
import postcssValueParser from 'postcss-value-parser';

const createMixinDecl = (value: string) => postcss.decl({ prop: valueMapping.mixin, value });
const createPartialMixinDecl = (value: string) =>
    postcss.decl({ prop: valueMapping.partialMixin, value });
const parseMixin = (mixinDecl: postcss.Declaration) => {
    const mix = SBTypesParsers[valueMapping.mixin](mixinDecl, () => 'named');
    return mix;
};

const parsePartialMixin = (mixinDecl: postcss.Declaration) => {
    const mix = SBTypesParsers[valueMapping.partialMixin](mixinDecl, () => 'named');
    return mix;
};

describe('helpers/mixin', () => {
    describe('-st-mixin parse', () => {
        it('named arguments with no params', () => {
            const mixinDecl = createMixinDecl('Button');
            expect(parseMixin(mixinDecl)).to.eql([
                {
                    type: 'Button',
                    options: {},
                    valueNode: postcssValueParser('Button').nodes[0],
                    originDecl: mixinDecl,
                },
            ]);
        });

        it('named arguments with empty params', () => {
            const mixinDecl = createMixinDecl('Button()');
            expect(parseMixin(mixinDecl)).to.eql([
                {
                    type: 'Button',
                    options: {},
                    valueNode: postcssValueParser('Button()').nodes[0],
                    originDecl: mixinDecl,
                },
            ]);
        });

        it('named arguments with one simple param', () => {
            const mixinDecl = createMixinDecl('Button(color red)');
            expect(parseMixin(mixinDecl)).to.eql([
                {
                    type: 'Button',
                    options: { color: 'red' },
                    valueNode: postcssValueParser('Button(color red)').nodes[0],
                    originDecl: mixinDecl,
                },
            ]);
        });

        it('named arguments with two simple params', () => {
            const mixinDecl = createMixinDecl('Button(color red, color2 green)');
            expect(parseMixin(mixinDecl)).to.eql([
                {
                    type: 'Button',
                    options: { color: 'red', color2: 'green' },
                    valueNode: postcssValueParser('Button(color red, color2 green)').nodes[0],
                    originDecl: mixinDecl,
                },
            ]);
        });

        it('named arguments with a trailing comma', () => {
            const mixinDecl = createMixinDecl('Button(color red,)');
            expect(parseMixin(mixinDecl)).to.eql([
                {
                    type: 'Button',
                    options: { color: 'red' },
                    valueNode: postcssValueParser('Button(color red,)').nodes[0],
                    originDecl: mixinDecl,
                },
            ]);
        });

        it('multiple named arguments with a trailing comma', () => {
            const mixinDecl = createMixinDecl('Button(color red, size 2px,)');
            expect(parseMixin(mixinDecl)).to.eql([
                {
                    type: 'Button',
                    options: { color: 'red', size: '2px' },
                    valueNode: postcssValueParser('Button(color red, size 2px,)').nodes[0],
                    originDecl: mixinDecl,
                },
            ]);
        });

        it('named arguments with one param with spaces', () => {
            const mixinDecl = createMixinDecl('Button(border 1px solid red)');
            expect(parseMixin(mixinDecl)).to.eql([
                {
                    type: 'Button',
                    options: { border: '1px solid red' },
                    valueNode: postcssValueParser('Button(border 1px solid red)').nodes[0],
                    originDecl: mixinDecl,
                },
            ]);
        });
    });

    it('partial mixin annotation parse', () => {
        const mixinDecl = createPartialMixinDecl('Button(border 1px solid red)');
        expect(parsePartialMixin(mixinDecl)).to.eql([
            {
                type: 'Button',
                options: { border: '1px solid red' },
                partial: true,
                valueNode: postcssValueParser('Button(border 1px solid red)').nodes[0],
                originDecl: mixinDecl,
            },
        ]);
    });
});
