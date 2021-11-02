import { STPart, CSSClass, CSSType } from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
import { generateStylableResult } from '@stylable/core-test-kit';
import { expect } from 'chai';

describe(`features/st-part`, () => {
    describe(`meta`, () => {
        it(`should collect class part definitions`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            .a {}
                            .b {}
                        `,
                    },
                },
            });

            expect(STPart.getPart(meta, `a`), `a`).to.eql({
                node: meta.ast.nodes[0],
                symbol: CSSClass.getClass(meta, `a`),
            });
            expect(STPart.getPart(meta, `b`), `b`).to.eql({
                node: meta.ast.nodes[1],
                symbol: CSSClass.getClass(meta, `b`),
            });
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.simpleSelectors),
                `deprecated 'meta.simpleSelectors'`
            ).to.eql({
                a: STPart.getPart(meta, `a`),
                b: STPart.getPart(meta, `b`),
            });
        });
        it(`should collect only type selector component part definitions (capital letter)`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            span {}
                            Comp {}
                        `,
                    },
                },
            });

            expect(STPart.getPart(meta, `Comp`), `component`).to.eql({
                node: meta.ast.nodes[1],
                symbol: CSSType.getType(meta, `Comp`),
            });
            expect(STPart.getPart(meta, `span`), `native`).to.equal(undefined);
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.simpleSelectors),
                `deprecated 'meta.simpleSelectors'`
            ).to.eql({
                Comp: STPart.getPart(meta, `Comp`),
            });
        });
        it(`should NOT have root class symbol by default`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: ``,
                    },
                },
            });

            expect(STPart.getPart(meta, `root`)).to.equal(undefined);
        });
        it(`should collect defined root class`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `.root {}`,
                    },
                },
            });

            expect(STPart.getPart(meta, `root`)).to.eql({
                node: meta.ast.nodes[0],
                symbol: CSSClass.getClass(meta, `root`),
            });
        });
    });
});
