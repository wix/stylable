const { expect } = require('chai');
import { create } from '../../src/css-runtime-stylesheet-legacy';

describe.only('Stylable runtime stylesheet (LEGACY)', () => {
    it('creates stylesheet with mapping ', () => {
        const stylesheet = create(
            'entry',
            {
                classes: { root: 'entry__root' },
                keyframes: {},
                vars: {},
                stVars: {}
            },
            '',
            0,
            'test-stylesheet.st.css',
            null
        );

        expect(stylesheet('root')).to.eql({ className: 'entry__root' });
    });

    it('style multi classNames + global', () => {
        const stylesheet = create(
            'entry',
            {
                classes: { root: 'entry__root' },
                keyframes: {},
                vars: {},
                stVars: {}
            },
            '',
            0,
            'test-stylesheet.st.css',
            null
        );

        expect(stylesheet('root global')).to.eql({ className: 'entry__root global' });
        expect(stylesheet('root global', {}, { className: 'parent', ['data-test']: true })).to.eql({
            className: 'entry__root global parent',
            ['data-test']: true
        });
    });

    it('style should output new state format (classes)', () => {
        const stylesheet = create(
            'entry',
            {
                classes: { root: 'entry__root' },
                keyframes: {},
                vars: {},
                stVars: {}
            },
            '',
            0,
            'test-stylesheet.st.css',
            null
        );

        expect(stylesheet('root', { loading: true, col: 3 })).to.eql({
            className: 'entry__root entry--loading entry---col-1-3'
        });
    });
});
