import { generateStylableResult } from '@stylable/core-test-kit';
import { expect } from 'chai';
import postcss from 'postcss';

import { applyStylableForceStateSelectors, createDataAttr, OVERRIDE_STATE_PREFIX } from '@stylable/webpack-extensions';

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
                    `
                }
            }
        });

        applyStylableForceStateSelectors(res.meta.outputAst!, {
            entry: true
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
                    `
                }
            }
        });

        applyStylableForceStateSelectors(res.meta.outputAst!, {
            entry: true
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
                    `
                }
            }
        });

        applyStylableForceStateSelectors(res.meta.outputAst!, {
            entry: true
        });

        expect((res.meta.outputAst!.nodes![1] as postcss.Rule).selector).to.equal(
            // tslint:disable-next-line: max-line-length
            `.entry__root.entry---myState-5-value,.entry__root[${createDataAttr(OVERRIDE_STATE_PREFIX, 'myState', 'value')}]`
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
                    `
                }
            }
        });

        applyStylableForceStateSelectors(res.meta.outputAst!, {
            entry: true
        });

        expect((res.meta.outputAst!.nodes![1] as postcss.Rule).selector).to.equal(
            // tslint:disable-next-line: max-line-length
            `.entry__root[class~="entry---myState-10-some_value"],.entry__root[${createDataAttr(OVERRIDE_STATE_PREFIX, 'myState', 'some value')}]`
        );
    });
});
