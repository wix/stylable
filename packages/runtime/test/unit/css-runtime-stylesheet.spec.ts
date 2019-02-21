const { expect } = require('chai');
import { create } from '../../src/css-runtime-stylesheet';

describe('Stylable runtime stylesheet', () => {
    it('creates stylesheet with mapping ', () => {
        const style = create(
            'root',
            'entry',
            { root: 'entry--root' },
            '',
            0,
            'test-stylesheet.st.css'
        );

        expect(style.root).to.equal('entry--root');
    });

    it('creates stylesheet with css vars ', () => {
        const style = create(
            'root',
            'entry',
            { 'root': 'entry--root', '--myVar': '--entry-myVar' },
            '',
            0,
            'test-stylesheet.st.css'
        );

        expect(style['--myVar']).to.equal('--entry-myVar');
    });
});
