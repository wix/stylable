import { expect } from 'chai';
import postcss from 'postcss';
import { SBTypesParsers, valueMapping } from '../src/stylable-value-parsers';
import { Diagnostics } from '../src';

const parseMixin = (mixinValue: string) => {
    return SBTypesParsers[valueMapping.mixin](postcss.decl({ value: mixinValue }), () => 'named');
};

const parseNamedImport = (value: string) =>
    SBTypesParsers[valueMapping.named](value, postcss.decl(), new Diagnostics());

describe('stylable-value-parsers', () => {
    describe('-st-named', () => {
        it('empty value', () => {
            const { keyframesMap, namedMap } = parseNamedImport('');
            expect(keyframesMap, 'keyframes').to.eql({});
            expect(namedMap, 'named').to.eql({});
        });
        it('only named', () => {
            const { keyframesMap, namedMap } = parseNamedImport('a, b, c');
            expect(keyframesMap, 'keyframes').to.eql({});
            expect(namedMap, 'named').to.eql({ a: 'a', b: 'b', c: 'c' });
        });
        it('named as', () => {
            const { keyframesMap, namedMap } = parseNamedImport('a as b, b as c, c as d');
            expect(keyframesMap, 'keyframes').to.eql({});
            expect(namedMap, 'named').to.eql({ b: 'a', c: 'b', d: 'c' });
        });
        it('keyframes', () => {
            const { keyframesMap, namedMap } = parseNamedImport('keyframes(a)');
            expect(keyframesMap, 'keyframes').to.eql({ a: 'a' });
            expect(namedMap, 'named').to.eql({});
        });
        it('keyframes with as', () => {
            const { keyframesMap, namedMap } = parseNamedImport('keyframes(a as b)');
            expect(keyframesMap, 'keyframes').to.eql({ b: 'a' });
            expect(namedMap, 'named').to.eql({});
        });
        it('multiple keyframes', () => {
            const { keyframesMap, namedMap } = parseNamedImport('keyframes(a, b, c)');
            expect(keyframesMap, 'keyframes').to.eql({ a: 'a', b: 'b', c: 'c' });
            expect(namedMap, 'named').to.eql({});
        });
        it('mix named and keyframes', () => {
            const { keyframesMap, namedMap } = parseNamedImport('a, b, keyframes(a, b, c), c, d');
            expect(keyframesMap, 'keyframes').to.eql({ a: 'a', b: 'b', c: 'c' });
            expect(namedMap, 'named').to.eql({ a: 'a', b: 'b', c: 'c', d: 'd' });
        });
        it('mix named and keyframes with as', () => {
            const { keyframesMap, namedMap } = parseNamedImport(
                'a as x, b, keyframes(a, b as z, c), c as y, d'
            );
            expect(keyframesMap, 'keyframes').to.eql({ a: 'a', z: 'b', c: 'c' });
            expect(namedMap, 'named').to.eql({ x: 'a', b: 'b', y: 'c', d: 'd' });
        });

        it('mix named and keyframes and comments', () => {
            const { keyframesMap, namedMap } = parseNamedImport(
                'a as x /* comment 0 */, b, /* comment 1 */keyframes(a, b as z, c), c as y, d'
            );
            expect(keyframesMap, 'keyframes').to.eql({ a: 'a', z: 'b', c: 'c' });
            expect(namedMap, 'named').to.eql({ x: 'a', b: 'b', y: 'c', d: 'd' });
        });

        it('keyframes nested', () => {
            const { keyframesMap, namedMap } = parseNamedImport(
                'keyframes(a as b, keyframes(d), e), f'
            );
            expect(keyframesMap, 'keyframes').to.eql({ b: 'a', d: 'd', e: 'e' });
            expect(namedMap, 'named').to.eql({ f: 'f' });
        });

        it('"as" edge case', () => {
            const { keyframesMap, namedMap } = parseNamedImport('as');
            expect(keyframesMap, 'keyframes').to.eql({});
            expect(namedMap, 'named').to.eql({ as: 'as' });
        });

        it('broken "as" edge case (broken at end)', () => {
            const { keyframesMap, namedMap } = parseNamedImport('a as');
            expect(keyframesMap, 'keyframes').to.eql({});
            expect(namedMap, 'named').to.eql({});
        });
        it('broken "as" edge case (with more nodes)', () => {
            const { keyframesMap, namedMap } = parseNamedImport('a as, x');
            expect(keyframesMap, 'keyframes').to.eql({});
            expect(namedMap, 'named').to.eql({ x: 'x' });
        });
        it('"as" "as"', () => {
            const { keyframesMap, namedMap } = parseNamedImport('as as x');
            expect(keyframesMap, 'keyframes').to.eql({});
            expect(namedMap, 'named').to.eql({ x: 'as' });
        });
        describe('errors', () => {
            it('invalid "as"', () => {
                const diagnostics = new Diagnostics();
                const value = 'x as';
                SBTypesParsers[valueMapping.named](
                    value,
                    postcss.decl({ prop: '-st-named', value }),
                    diagnostics
                );
                expect(diagnostics.reports).to.be.lengthOf(1);
                expect(diagnostics.reports[0].message).to.equal(
                    'Invalid named import "as" with name "x"'
                );
            });
            it('invalid nested keyframes', () => {
                const diagnostics = new Diagnostics();
                const value = 'keyframes(a, keyframes(b))';
                SBTypesParsers[valueMapping.named](
                    value,
                    postcss.decl({ prop: '-st-named', value }),
                    diagnostics
                );
                expect(diagnostics.reports).to.be.lengthOf(1);
                expect(diagnostics.reports[0].message).to.equal(
                    'Invalid nested keyframes import "keyframes(b)"'
                );
            });
        });
    });

    describe('-st-mixin', () => {
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
});
