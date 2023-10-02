import { create } from '@stylable/runtime';
import type { PartialElement } from '@stylable/dom-test-kit';
import { expect } from 'chai';

export const contractTest =
    <T extends PartialElement>(
        StylableUtilClass: any,
        options: { scopeSelectorTest?: boolean; createElement: () => T }
    ) =>
    () => {
        const s = create(
            'ns',
            {
                classes: { root: 'ns-root', x: 'ns__x', y: 'ns__y', z: 'ns__z ns__y' },
                keyframes: {},
                layers: {},
                containers: {},
                vars: {},
                stVars: {},
            },
            '',
            0,
            '0',
            null
        );

        const util = new StylableUtilClass(s);

        if (options.scopeSelectorTest) {
            it('scopeSelector defaults to root', () => {
                expect(util.scopeSelector()).to.equal(`.ns-root`);
            });
            it('scopeSelector local class', () => {
                expect(util.scopeSelector('.x')).to.equal(`.ns__x`);
            });
            it('scopeSelector local class with compose', () => {
                expect(util.scopeSelector('.z')).to.equal(`.ns__z`);
            });
            it('scopeSelector handle multiple local classes', () => {
                expect(util.scopeSelector('.x .y')).to.equal(`.ns__x .ns__y`);
            });
            it('scopeSelector Error("pseudo-element")', () => {
                expect(() => util.scopeSelector('.x::y')).to.throw(
                    'selector with pseudo-element is not supported yet.'
                );
            });
            it('scopeSelector Error("type")', () => {
                expect(() => util.scopeSelector('x')).to.throw(
                    'selector with type is not supported yet.'
                );
            });
            it('scopeSelector handle local states', () => {
                expect(util.scopeSelector('.x:loading')).to.equal(`.ns__x.ns--loading`);
            });
            it('scopeSelector handles local state with a paramter', () => {
                expect(util.scopeSelector('.x:loading(done)')).to.equal(
                    `.ns__x.ns---loading-4-done`
                );
            });
            it('scopeSelector handle class local states (multiple)', () => {
                expect(util.scopeSelector('.x:loading:thinking')).to.equal(
                    `.ns__x.ns--loading.ns--thinking`
                );
            });
        }

        describe('Style state', () => {
            it('hasStyleState returns true if the requested style state exists', async () => {
                const elem = options.createElement();
                elem.classList.add(s.cssStates({ loading: true }));
                expect(await util.hasStyleState(elem, 'loading')).to.equal(true);
            });
            it('getStyleState returns the requested boolean style state value', async () => {
                const elem = options.createElement();
                elem.classList.add(s.cssStates({ loading: true }));
                expect(await util.getStyleState(elem, 'loading')).to.equal(true);
            });
            it('getStyleState returns the requested string style state value', async () => {
                const elem = options.createElement();
                elem.classList.add(s.cssStates({ loading: 'value' }));
                expect(await util.getStyleState(elem, 'loading')).to.equal('value');
            });
        });
    };
