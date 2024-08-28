import { getAtRuleByPosition } from '@stylable/language-service/dist/lib/utils/postcss-ast-utils';
import { topLevelDirectives } from '@stylable/language-service/dist/lib/completion-types';
import { expect } from 'chai';
import postcss from 'postcss';
import { getCaretPosition } from '../test-kit/asserters';

function getCSSAndPosition(css: string) {
    const pos = getCaretPosition(css);
    css = css.replace('|', '');

    return { css, pos };
}

const stImportName = topLevelDirectives.stImport.slice(1);

describe('getAtRuleByPosition', () => {
    it('should return top level root', () => {
        const { css, pos } = getCSSAndPosition('|');

        const root = postcss.parse(css);

        expect(getAtRuleByPosition(root, pos, topLevelDirectives.stImport)).to.equal(undefined);
    });

    it('should return at rule when in block', () => {
        const { css, pos } = getCSSAndPosition(`@media screen {
            |
        }`);

        const root = postcss.parse(css);

        expect(getAtRuleByPosition(root, pos, 'media')!.name).to.equal('media');
    });

    it('should return at rule when node ends with ";"', () => {
        const { css, pos } = getCSSAndPosition(`@st-import Comp |;`);

        const root = postcss.parse(css);

        expect(getAtRuleByPosition(root, pos, stImportName)!.name).to.equal(stImportName);
    });

    it('should return correct at rule from many', () => {
        const { css, pos } = getCSSAndPosition(`
        @st-import Comp from './stylesheet.st.css';
        @st-import | from './stylesheet2.st.css';
        @st-import Comp3 from './stylesheet3.st.css';
        `);

        const root = postcss.parse(css);

        expect(getAtRuleByPosition(root, pos, stImportName)!.toString()).to.equal(
            `@st-import  from './stylesheet2.st.css'`,
        );
    });

    it('should return undefined for locations outside the requested at rule ', () => {
        const { css, pos } = getCSSAndPosition(`
        @st-import Comp from './stylesheet.st.css';
        @st-import Comp2 from './stylesheet2.st.css';
        .root {
            |
        }
        `);

        const root = postcss.parse(css);

        expect(getAtRuleByPosition(root, pos, stImportName)).to.equal(undefined);
    });
});
