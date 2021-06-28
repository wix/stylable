import { expect } from 'chai';
import { matchSelectorTarget } from '@stylable/core';

describe('deprecated/selector-utils', () => {
    describe('matchSelectorTarget', () => {
        it('source should be composed of only one compound selector', () => {
            expect(() => matchSelectorTarget('.x,.menu::button', '.x')).to.throw(
                'source selector must not be composed of more than one compound selector'
            );
        });

        it('should return true if requesting selector is contained in target selector', () => {
            expect(matchSelectorTarget('.menu::button', '.x .menu:hover::button'), '1').to.equal(
                true
            );
            expect(matchSelectorTarget('.x .menu::button', '.menu::button::hover'), '2').to.equal(
                false
            );

            expect(matchSelectorTarget('.menu::button', '.button'), '3').to.equal(false);
            expect(matchSelectorTarget('.menu::button', '.menu'), '4').to.equal(false);
            expect(matchSelectorTarget('.menu', '.menu::button'), '5').to.equal(false);
        });

        it('should not match empty requested selector in emptyly', () => {
            expect(matchSelectorTarget('', '.menu::button')).to.equal(false);
        });

        it('should compare node types when comparing', () => {
            expect(matchSelectorTarget('.x::y', '.x::y'), '1').to.equal(true);
            expect(matchSelectorTarget('.x::y', '.x.y'), '2').to.equal(false);
            expect(matchSelectorTarget('.a::a', '.a.a'), '3').to.equal(false);
            expect(matchSelectorTarget('.a::a', '.a::a'), '4').to.equal(true);
        });

        it('should support multiple compound selectors', () => {
            expect(matchSelectorTarget('.x', '.y,.x')).to.equal(true);
            expect(matchSelectorTarget('.x', '.y,.z')).to.equal(false);
        });

        it('should regard order', () => {
            expect(matchSelectorTarget('.x::y', '.y::x')).to.equal(false);
        });

        it('should not match if end is different', () => {
            expect(matchSelectorTarget('.x::y::z', '.x::y::k')).to.equal(false);
        });

        it('should group by classes', () => {
            expect(matchSelectorTarget('.x::y', '.x::y.z'), '1').to.equal(true);
            expect(matchSelectorTarget('.x::y', '.x::y::z'), '2').to.equal(false);
            expect(matchSelectorTarget('.x', '.x.z'), '3').to.equal(true);
        });

        it('should filter duplicate classes', () => {
            expect(matchSelectorTarget('.x.x::y.z', '.x::y.z'), '1').to.equal(true);
            expect(matchSelectorTarget('.x::y.x.z', '.x::y.z'), '2').to.equal(true);
            expect(matchSelectorTarget('.x::y.x.x.x::z.z', '.x::y'), '3').to.equal(false);
            expect(matchSelectorTarget('.x.x.x::y.z', '.x::y.z'), '4').to.equal(true);
        });
    });
});
