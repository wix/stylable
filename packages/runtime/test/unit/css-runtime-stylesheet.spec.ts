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

    it('uses the "$cssVars" utility function to generate react style compatible styling', () => {
        const style = create(
            'root',
            'entry',
            { 'root': 'entry--root', '--myVar': '--entry-myVar' },
            '',
            0,
            'test-stylesheet.st.css'
        );

        expect(style.$cssVars({ '--myVar': 'green' })).to.contain({ '--entry-myVar': 'green' });
    });

    // tslint:disable-next-line:max-line-length
    it('uses the "$cssVars" utility to generate an object with a "toString" function that is compatible with html inline style', () => {
        const style = create(
            'root',
            'entry',
            { 'root': 'entry--root', '--myBG': '--entry-myBG', '--myColor': '--entry-myColor' },
            '',
            0,
            'test-stylesheet.st.css'
        );

        expect(style.$cssVars({ '--myBG': 'green', '--myColor': 'blue' }).toString())
            .to.equal(`--entry-myBG: green; --entry-myColor: blue; `);
    });
});
