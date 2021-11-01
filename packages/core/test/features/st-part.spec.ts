import { STPart, CSSClass } from '@stylable/core/dist/features';
import { generateStylableResult } from '@stylable/core-test-kit';
import { expect } from 'chai';

describe(`features/st-part`, () => {
    describe(`meta`, () => {
        it(`should collect part definitions`, () => {
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
