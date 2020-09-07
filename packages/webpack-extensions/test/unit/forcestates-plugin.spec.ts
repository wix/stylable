import { generateStylableResult } from '@stylable/core-test-kit';
import { expect } from 'chai';
import postcss from 'postcss';

import {
    applyStylableForceStateSelectors,
    createDataAttr,
    OVERRIDE_STATE_PREFIX,
    createForceStateMatchers,
    DOMLocationBasedPseudoClasses,
} from '@stylable/webpack-extensions';

describe('createForceStateMatchers', () => {
    it('should remove states from selector', () => {
        const out = createForceStateMatchers('.x:hover:focus:disabled');
        expect(out).to.eql([
            [
                {
                    selector: '.x',
                    states: [
                        { type: 'pseudo-class', name: 'hover' },
                        { type: 'pseudo-class', name: 'focus' },
                        { type: 'pseudo-class', name: 'disabled' },
                    ],
                },
            ],
        ]);
    });
    it('should remove states from selector at all locations', () => {
        const out = createForceStateMatchers('.x:hover:focus .y:disabled::part:hover');
        expect(out).to.eql([
            [
                {
                    selector: '.x',
                    states: [
                        { type: 'pseudo-class', name: 'hover' },
                        { type: 'pseudo-class', name: 'focus' },
                    ],
                },
                {
                    selector: '.x .y',
                    states: [{ type: 'pseudo-class', name: 'disabled' }],
                },
                {
                    selector: '.x .y::part',
                    states: [{ type: 'pseudo-class', name: 'hover' }],
                },
            ],
        ]);
    });

    it('should ignore DOMStructurePseudoClasses from states', () => {
        const out = createForceStateMatchers(
            `.x:${Array.from(DOMLocationBasedPseudoClasses).join(':')}`
        );
        expect(out).to.eql([
            [
                {
                    selector: `.x:${Array.from(DOMLocationBasedPseudoClasses).join(':')}`,
                    states: [],
                },
            ],
        ]);
    });

    it('should ignore :not() nested-pseudo-class states', () => {
        const out = createForceStateMatchers(`.x:not(.y):hover`);
        expect(out).to.eql([
            [
                {
                    selector: `.x:not(.y)`,
                    states: [{ type: 'pseudo-class', name: 'hover' }],
                },
            ],
        ]);
    });
});

describe('stylable-forcestates-plugin', () => {
    it('should mark a boolean state as forced using a data-attribute selector', () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                    .root {
                        -st-states: myState;
                    }

                    .root:myState {
                        color: green;
                    }
                    `,
                },
            },
        });

        applyStylableForceStateSelectors(res.meta.outputAst!, {
            entry: true,
        });

        expect((res.meta.outputAst!.nodes![1] as postcss.Rule).selector).to.equal(
            '.entry__root.entry--myState,.entry__root[stylable-force-state-myState]'
        );
    });
    it('should mark a boolean state as forced using a data-attribute selector (namespace mapping function)', () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                    .root {
                        -st-states: myState;
                    }

                    .root:myState {
                        color: green;
                    }
                    `,
                },
            },
        });

        applyStylableForceStateSelectors(res.meta.outputAst!, (name) => {
            return name === 'entry';
        });

        expect((res.meta.outputAst!.nodes![1] as postcss.Rule).selector).to.equal(
            '.entry__root.entry--myState,.entry__root[stylable-force-state-myState]'
        );
    });

    it('should mark a native state as forced using a data-attribute selector', () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                    .root {}

                    .root:hover {
                        color: green;
                    }
                    `,
                },
            },
        });

        applyStylableForceStateSelectors(res.meta.outputAst!, {
            entry: true,
        });

        expect((res.meta.outputAst!.nodes![1] as postcss.Rule).selector).to.equal(
            '.entry__root:hover,.entry__root[stylable-force-state-hover]'
        );
    });

    it('should mark an class state woth param as forced using a data-attribute selector', () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                    .root {
                        -st-states: myState(string);
                    }

                    .root:myState(value) {
                        color: green;
                    }
                    `,
                },
            },
        });

        applyStylableForceStateSelectors(res.meta.outputAst!, {
            entry: true,
        });

        expect((res.meta.outputAst!.nodes![1] as postcss.Rule).selector).to.equal(
            `.entry__root.entry---myState-5-value,.entry__root[${createDataAttr(
                OVERRIDE_STATE_PREFIX,
                'myState',
                'value'
            )}]`
        );
    });

    it('should mark an attribute state (illegal class name) as forced using a data-attribute selector', () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                    .root {
                        -st-states: myState(string);
                    }

                    .root:myState(some value) {
                        color: green;
                    }
                    `,
                },
            },
        });

        applyStylableForceStateSelectors(res.meta.outputAst!, {
            entry: true,
        });

        expect((res.meta.outputAst!.nodes![1] as postcss.Rule).selector).to.equal(
            `.entry__root[class~="entry---myState-10-some_value"],.entry__root[${createDataAttr(
                OVERRIDE_STATE_PREFIX,
                'myState',
                'some value'
            )}]`
        );
    });
});
