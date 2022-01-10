import { testStylableCore } from '@stylable/core-test-kit';
import { CSSClass } from '@stylable/core/dist/features';
import { expect } from 'chai';

describe(`testStylableCore()`, () => {
    it(`should accept a single "entry.st.css" and return transformed meta/exports`, () => {
        const { sheets } = testStylableCore(``);

        const { meta, exports } = sheets[`/entry.st.css`];

        expect(CSSClass.get(meta, `root`), `meta`).to.contain({
            _kind: `class`,
            name: `root`,
        });
        expect(exports.classes.root, `exports.classes`).to.equal(`entry__root`);
    });
    it(`should inline test stylable content`, () => {
        expect(() =>
            testStylableCore(`
                /* @rule .entry__pass */
                .pass {}
            `)
        ).to.not.throw();

        expect(() =>
            testStylableCore(`
                /* @rule .xxx__fail */
                .fail {}
            `)
        ).to.throw();
    });
    it(`should expose stylable instance and filesystem`, () => {
        const { stylable, fs } = testStylableCore(`.part {}`);

        fs.writeFileSync(
            `/new.st.css`,
            `
            @st-import [part] from './entry.st.css';
            .part {}
            `
        );
        const newMeta = stylable.process(`/new.st.css`);
        stylable.transform(newMeta);

        expect(newMeta.outputAst?.toString().trim()).to.equal(`.entry__part {}`);
    });
});
