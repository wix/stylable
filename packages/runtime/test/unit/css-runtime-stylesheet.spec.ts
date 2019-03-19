const { expect } = require('chai');
import { create } from '../../src/css-runtime-stylesheet';

describe('Stylable runtime stylesheet', () => {
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

        expect(stylesheet.classes.root).to.equal('entry__root');
    });

    it('style function edge cases, trimming and filtering falsy arguments', () => {
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

        expect(stylesheet.style('entry__root', undefined)).to.equal('entry__root');
        expect(stylesheet.style('entry__root', ' ')).to.equal('entry__root  ');
        expect(stylesheet.style('entry__root', ' x ')).to.equal('entry__root  x ');
        expect(stylesheet.style('entry__root', '', '')).to.equal('entry__root');
        expect(stylesheet.style('entry__root', {}, '', undefined)).to.equal('entry__root');
    });

    it('creates stylesheet with css vars ', () => {
        const stylesheet = create(
            'entry',
            {
                classes: { root: 'entry__root' },
                keyframes: {},
                vars: { myVar: '--entry-myVar' },
                stVars: {}
             },
            '',
            0,
            'test-stylesheet.st.css',
            null
        );

        expect(stylesheet.vars.myVar).to.equal('--entry-myVar');
    });
});
