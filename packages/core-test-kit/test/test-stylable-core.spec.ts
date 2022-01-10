import { testStylableCore } from '@stylable/core-test-kit';
import { CSSClass } from '@stylable/core/dist/features';
import { createMemoryFs } from '@file-services/memory';
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
    describe(`multiple files`, () => {
        it(`should accept a multiple files (transform all by default)`, () => {
            const { sheets } = testStylableCore({
                '/a.st.css': ``,
                '/b.st.css': ``,
            });

            const a = sheets[`/a.st.css`];
            const b = sheets[`/b.st.css`];

            expect(CSSClass.get(a.meta, `root`), `a meta`).to.contain({ name: `root` });
            expect(a.exports.classes.root, `a exports`).equal(`a__root`);
            expect(CSSClass.get(b.meta, `root`), `b meta`).to.contain({ name: `root` });
            expect(b.exports.classes.root, `b exports`).equal(`b__root`);
        });
        it(`should accept entries to transform`, () => {
            const { sheets } = testStylableCore(
                {
                    '/entry.st.css': ``,
                    '/a.st.css': ``,
                    '/b.st.css': ``,
                },
                {
                    entries: [`/a.st.css`, `/b.st.css`],
                }
            );

            const entryNotProcessed = sheets[`/entry.st.css`];
            const a = sheets[`/a.st.css`];
            const b = sheets[`/b.st.css`];

            expect(entryNotProcessed, `entry not processed`).to.equal(undefined);
            expect(a.exports.classes.root, `b exports.classes`).to.equal(`a__root`);
            expect(b.exports.classes.root, `b exports.classes`).to.equal(`b__root`);
        });
        it(`should throw on none absolute path entry`, () => {
            expect(() =>
                testStylableCore(
                    {
                        '/a.st.css': ``,
                    },
                    {
                        entries: [`a.st.css`],
                    }
                )
            ).to.throw(testStylableCore.errors.absoluteEntry(`a.st.css`));
        });
        it(`should inline test all files (even these that are not linked to entries)`, () => {
            expect(() =>
                testStylableCore({
                    '/entry.st.css': `
                        /* @rule .entry__part */
                        .part {}
                    `,
                    '/other.st.css': `
                        /* @rule .other__part */
                        .part {}
                    `,
                })
            ).to.not.throw();

            expect(() =>
                testStylableCore({
                    '/entry.st.css': `
                        /* @rule .entry__part */
                        .part {}
                    `,
                    '/other.st.css': `
                        /* @rule .fail__part */
                        .part {}
                    `,
                })
            ).to.throw();
        });
    });
    describe(`stylable config`, () => {
        it(`should pass configuration to stylable instance`, () => {
            const onProcessCalls: any[] = [];
            const { sheets } = testStylableCore(``, {
                stylableConfig: {
                    onProcess(meta, path) {
                        onProcessCalls.push({ meta, path });
                        return meta;
                    },
                },
            });

            expect(onProcessCalls).to.eql([
                { meta: sheets[`/entry.st.css`].meta, path: `/entry.st.css` },
            ]);
        });
        it(`should use filesystem from configuration (ignore input)`, () => {
            const inputFS = createMemoryFs({
                '/abc.st.css': ``,
            });
            const { fs, sheets } = testStylableCore(``, {
                stylableConfig: {
                    filesystem: inputFS,
                },
            });

            expect(fs, `filesystem`).to.equal(inputFS);
            expect(sheets['/abc.st.css'].exports.classes.root, `sheet from config fs`).to.equal(
                `abc__root`
            );
        });
    });
});
