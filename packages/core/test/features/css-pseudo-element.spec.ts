import { testStylableCore, shouldReportNoDiagnostics } from '@stylable/core-test-kit';

describe('features/css-pseudo-element', () => {
    // ToDo: move rest of tests here once the feature is extracted
    describe('st-custom-selector', () => {
        it('should expand custom selector', () => {
            const { sheets } = testStylableCore({
                'comp.st.css': `
                    @custom-selector :--root-icon .root > .icon;
                `,
                'entry.st.css': `
                    @st-import Comp from './comp.st.css';

                    /* @rule .entry__root .comp__root > .comp__icon */
                    .root Comp::root-icon {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should prefer a custom selector to a class with the same name', () => {
            const { sheets } = testStylableCore({
                'comp.st.css': `
                    @custom-selector :--red .green;
                    .red {}
                `,
                'entry.st.css': `
                    @st-import Comp from './comp.st.css';

                    /* @rule .entry__root .comp__root .comp__green */
                    .root Comp::red {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should expand custom selector through 2 levels (with -st-extends)', () => {
            const { sheets } = testStylableCore({
                'base.st.css': `
                    .part {}
                `,
                'comp.st.css': `
                    @st-import Base from './base.st.css';
                    .base {
                        -st-extends: Base;
                    }
                    @custom-selector :--custom .root > .base;
                `,
                'entry.st.css': `
                    @st-import Comp from './comp.st.css';

                    /* @rule .entry__root .comp__root > .comp__base .base__part */
                    .root Comp::custom::part {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should expand into multiple selectors', () => {
            const { sheets } = testStylableCore({
                'comp.st.css': `
                    @custom-selector :--multi .a, .b;
                `,
                'entry.st.css': `
                    @st-import Comp from './comp.st.css';

                    /* @rule(simple) .entry__root .comp__root .comp__a,.entry__root .comp__root .comp__b */
                    .root Comp::multi {}

                    /* @rule(nested) .entry__root .comp__root:has(.comp__a,.comp__b) */
                    .root Comp:has(::multi) {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should expand custom selector that override another custom selector', () => {
            const { sheets } = testStylableCore({
                'base.st.css': `
                    @custom-selector :--custom .custom;
                `,
                'comp.st.css': `
                    @st-import Base from './base.st.css';
                    @custom-selector :--custom Base::custom;
                    .root {
                        -st-extends: Base;
                    }
                `,
                'entry.st.css': `
                    @st-import Comp from './comp.st.css';

                    /* @rule .entry__root .comp__root .base__root .base__custom */
                    .root Comp::custom {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should transform custom element with multiple selector inside nested pseudo-classes', () => {
            testStylableCore(`
                @custom-selector :--part .partA, .partB;
                @custom-selector :--nestedPart ::part, .partC;

                /* @rule(1 level) .entry__root:not(.entry__partA,.entry__partB) */
                .root:not(::part) {}

                /* 
                    notice: partB is pushed at the end because of how custom selectors are
                    processed atm.

                    @rule(2 levels) .entry__root:not(.entry__partA,.entry__partC,.entry__partB) 
                */
                .root:not(::nestedPart) {}

                /* @rule(custom-selector syntax) 
                        .entry__root:not(.entry__partA),.entry__root:not(.entry__partB)
                */
                .root:not(:--part) {}
            `);
        });
        it('should expand with global root', () => {
            const { sheets } = testStylableCore({
                'comp.st.css': `
                    @custom-selector :--custom .part;
                    .root {
                        -st-global: ".glob";
                    }
                `,
                'entry.st.css': `
                    @st-import Comp from './comp.st.css';

                    /* @rule .entry__root .glob .comp__part */
                    .root Comp::custom {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it.skip('should handle circular reference', () => {
            // ToDo: refactor handleCustomSelector transformer flow to handle circularity
            testStylableCore(`
                @custom-selector :--x ::y;
                @custom-selector :--y ::x;
    
                /* @rule :--y */
                :--y {}
            `);
        });
        it('should resolve complex inheritance (multiple levels)', () => {
            const { sheets } = testStylableCore({
                'l4.st.css': `
                    .root {
                        -st-states:hovered;
                    }
                `,
                'l3.st.css': `
                    @st-import L4 from './l4.st.css';

                    .root {
                        -st-states:hovered;
                    }
                    .L3-part {
                        -st-extends: L4;
                    }
                `,
                'l2.st.css': `
                    @st-import L3 from './l3.st.css';

                    .L2-part {
                        -st-extends: L3;
                    }
                `,
                'l1.st.css': `
                    @st-import L2 from './l2.st.css';

                    .root {
                        -st-extends: L2;
                    }
                    @custom-selector :--customA .root::L2-part;
                    @custom-selector :--customB .root::L2-part::L3-part;
                `,
                'entry.st.css': `
                    @st-import L1 from './l1.st.css';

                    .root {
                        -st-extends: L1;
                    }

                    /* @rule .entry__root .l2__L2-part.l3--hovered */
                    .root::customA:hovered {}

                    /* @rule .entry__root .l2__L2-part .l3__L3-part.l4--hovered */
                    .root::customB:hovered {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
});
