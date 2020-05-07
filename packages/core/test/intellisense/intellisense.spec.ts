import { createTransformer } from '@stylable/core-test-kit';
import { expect } from 'chai';
import postcss from 'postcss';
import { expandCustomSelectors } from '../../src/stylable-utils';

describe('Stylable intellisense selector meta data', () => {
    it('resolve single class element', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                        .a {

                        }
                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');

        const elements = t.resolveSelectorElements(meta, '.a');

        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'a',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.a,
                        _kind: 'css',
                    },
                ],
            },
        ]);
    });

    it('naive multiple selector support', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                        .a, .b {

                        }
                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');

        const elements = t.resolveSelectorElements(meta, '.a, .b');

        expect(elements).to.eql([
            [
                {
                    type: 'class',
                    name: 'a',
                    resolved: [
                        {
                            meta,
                            symbol: meta.classes.a,
                            _kind: 'css',
                        },
                    ],
                },
            ],
            [
                {
                    type: 'class',
                    name: 'b',
                    resolved: [
                        {
                            meta,
                            symbol: meta.classes.b,
                            _kind: 'css',
                        },
                    ],
                },
            ],
        ]);
    });

    it('resolve pseudo-element', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                        :import {
                            -st-from: "./other.st.css";
                            -st-default: Other;
                        }
                        .a {
                            -st-extends: Other;
                            -st-states: b;
                        }
                    `,
                },
                '/other.st.css': {
                    content: `
                        .c {
                        }
                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const otherMeta = t.fileProcessor.process('/other.st.css');
        const elements = t.resolveSelectorElements(meta, '.a:b::c');

        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'a',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.a,
                        _kind: 'css',
                    },
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.root,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'c',
                resolved: [
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.c,
                        _kind: 'css',
                    },
                ],
            },
        ]);
    });

    // see more about this case: https://github.com/wix/stylable/issues/891
    xit('resolves with neasted-pseudo-class (should not include inner parts)', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                        .a {}
                        .b {}
                    `,
                },
            },
        });
        const meta = t.fileProcessor.process('/entry.st.css');
        const elements = t.resolveSelectorElements(meta, '.a:not(.b)');
        expect(elements.length).to.equal(1);
        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'a',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.a,
                        _kind: 'css',
                    },
                ],
            },
        ]);
    });

    it('should resolve elements for pseudo-element nested in a pseudo-state', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                        .root {}
                        .part {}

                        .root:not(::part) {}
                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const elements = t.resolveSelectorElements(meta, '.root:not(::part)');
        expect(elements[0].length).to.equal(2);

        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'root',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.root,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'part',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.part,
                        _kind: 'css',
                    },
                ],
            },
        ]);
    });

    it('should resolve elements for pseudo-element nested in a pseudo-state (@custom-selector)', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                        @custom-selector :--part .partA, .partB;
                        .root {}
                        .part{}
                        .partA {}
                        .partB {}

                        .root:not(::part) {}
                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const elements = t.resolveSelectorElements(meta, '.root:not(::part)');
        expect(elements[0].length).to.equal(2);

        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'root',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.root,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'part',
                resolved: [{ _kind: 'css', meta, symbol: { _kind: 'element', name: '*' } }],
            },
        ]);
    });

    it('resolves with globals???', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                        .a {
                            -st-states: x;
                        }
                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const elements = t.resolveSelectorElements(meta, '.a:global(.y):x');
        // const out = t.scopeSelector2(meta, '.a:global(.y):x', undefined, false, undefined).selector;
        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'a',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.a,
                        _kind: 'css',
                    },
                ],
            },
        ]);
    });

    it('resolves native/unknown pseudo?', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                        .a {}
                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const elements = t.resolveSelectorElements(meta, '.a::before');
        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'a',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.a,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'before',
                resolved: [],
            },
        ]);
    });

    it('resolves extends of named class', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                        :import {
                            -st-from: "./other.st.css";
                            -st-named: c;
                        }
                        .a {
                            -st-extends: c;
                        }
                    `,
                },
                '/other.st.css': {
                    content: `
                        .c {
                            -st-states: b;
                        }
                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const otherMeta = t.fileProcessor.process('/other.st.css');
        const elements = t.resolveSelectorElements(meta, '.a:b::c');
        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'a',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.a,
                        _kind: 'css',
                    },
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.c,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'c',
                resolved: [],
            },
        ]);
    });

    it('resolves local custom selector', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                    .lala {
                        -st-states: hello;
                    }

                    @custom-selector :--pongo .lala ;
                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const elements = t.resolveSelectorElements(
            meta,
            expandCustomSelectors(postcss.rule({ selector: ':--pongo' }), meta.customSelectors)
        );

        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'lala',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.lala,
                        _kind: 'css',
                    },
                ],
            },
        ]);
    });

    it('resolves pseudo custom selector', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                    :import {
                        -st-from: "./comp.st.css";
                        -st-default: Comp;
                     }
                    .x {
                        -st-extends: Comp;
                    }
                    .x::pongo {

                    }
                    `,
                },
                '/comp.st.css': {
                    content: `
                    .lala {
                        -st-states: hello;
                    }

                    @custom-selector :--pongo .lala ;

                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const otherMeta = t.fileProcessor.process('/comp.st.css');
        const elements = t.resolveSelectorElements(meta, '.x::pongo');

        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'x',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.x,
                        _kind: 'css',
                    },
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.root,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'pongo',
                resolved: [
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.lala,
                        _kind: 'css',
                    },
                ],
            },
        ]);
    });

    it('resolves pseudo custom selector (multiple selectors)', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                    :import {
                        -st-from: "./comp.st.css";
                        -st-default: Comp;
                     }
                    .x {
                        -st-extends: Comp;
                    }
                    .x::pongo {}
                    `,
                },
                '/comp.st.css': {
                    content: `
                    .lala {
                        -st-states: hello;
                    }

                    @custom-selector :--pongo .lala, .baba ;

                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const otherMeta = t.fileProcessor.process('/comp.st.css');
        const elements = t.resolveSelectorElements(meta, '.x::pongo');

        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'x',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.x,
                        _kind: 'css',
                    },
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.root,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'pongo',
                resolved: [
                    { _kind: 'css', meta: otherMeta, symbol: { _kind: 'element', name: '*' } },
                ],
            },
        ]);
    });

    it('resolve stylesheet root from default import', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                    :import {
                        -st-from: "./import.st.css";
                        -st-default: Comp;
                        -st-named: shlomo;
                     }

                     Comp {}
                    `,
                },
                '/import.st.css': {
                    content: `
                    .shlomo {
                        color: black;
                    }
                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const otherMeta = t.fileProcessor.process('/import.st.css');
        const elements = t.resolveSelectorElements(meta, 'Comp');

        expect(elements[0]).to.eql([
            {
                type: 'element',
                name: 'Comp',
                resolved: [
                    {
                        meta,
                        symbol: meta.elements.Comp,
                        _kind: 'css',
                    },
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.root,
                        _kind: 'css',
                    },
                ],
            },
        ]);
    });

    it('resolve complex selector with multiple inheritance of roots', () => {
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                    :import {
                        -st-from: "./recursive-import-2.st.css";
                        -st-default: Comp;
                    }

                    .gaga {
                        -st-extends: Comp;
                        -st-states: lala;
                    }
                `,
                },
                '/recursive-import-2.st.css': {
                    content: `
                    :import {
                        -st-from: "./recursive-import-1.st.css";
                        -st-default: Comp;
                    }

                    .bobo {
                        -st-extends: Comp;
                    }
                    `,
                },
                '/recursive-import-1.st.css': {
                    content: `
                    :import {
                        -st-from: "./recursive-import-0.st.css";
                        -st-default: Compi;
                    }

                    .shlomo {
                        color: black;
                    }

                    .momo{
                        -st-extends: Compi;
                        -st-states: anotherState;
                    }

                    .root {
                        -st-states : state,otherState;
                    }
                    `,
                },
                '/recursive-import-0.st.css': {
                    content: `
                    :import {
                        -st-from: "./recursive-import.st.css";
                        -st-default: Last;
                    }

                    .root {
                        -st-extends: Last;
                        -st-states : loompa;
                    }
                    `,
                },
                '/recursive-import.st.css': {
                    content: `
                    .root {}
                    `,
                },
            },
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const recursive2 = t.fileProcessor.process('/recursive-import-2.st.css');
        const recursive1 = t.fileProcessor.process('/recursive-import-1.st.css');
        const recursive0 = t.fileProcessor.process('/recursive-import-0.st.css');
        const last = t.fileProcessor.process('/recursive-import.st.css');

        const elements = t.resolveSelectorElements(
            meta,
            '.gaga:lala::bobo:otherState:state::momo:anotherState'
        );

        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'gaga',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.gaga,
                        _kind: 'css',
                    },
                    {
                        meta: recursive2,
                        symbol: recursive2.classes.root,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'bobo',
                resolved: [
                    {
                        meta: recursive2,
                        symbol: recursive2.classes.bobo,
                        _kind: 'css',
                    },
                    {
                        meta: recursive1,
                        symbol: recursive1.classes.root,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'momo',
                resolved: [
                    {
                        meta: recursive1,
                        symbol: recursive1.classes.momo,
                        _kind: 'css',
                    },
                    {
                        meta: recursive0,
                        symbol: recursive0.classes.root,
                        _kind: 'css',
                    },
                    {
                        meta: last,
                        symbol: last.classes.root,
                        _kind: 'css',
                    },
                ],
            },
        ]);
    });

    it('resolve pseudo-element imported through two levels ', () => {
        const t = createTransformer({
            entry: `/style.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: './mid.st.css';
                            -st-default: ButtonPreset;
                        }
                        .root {
                            -st-extends: ButtonPreset;
                        }
                        .root::base {}
                        .root::mid::base {}
                        `,
                },
                '/mid.st.css': {
                    namespace: 'mid',
                    content: `
                        :import {
                            -st-from: './base.st.css';
                            -st-default: Button;
                        }
                        .root {
                            -st-extends: Button;
                        }
                        .mid {
                            -st-extends: Button;
                        }
                        `,
                },
                '/base.st.css': {
                    namespace: 'base',
                    content: `
                        .root {}
                        .base {}
                        `,
                },
            },
        });

        const entryMeta = t.fileProcessor.process('/entry.st.css');
        const midMeta = t.fileProcessor.process('/mid.st.css');
        const baseMeta = t.fileProcessor.process('/base.st.css');

        const elements1 = t.resolveSelectorElements(entryMeta, '.root::base');
        const elements2 = t.resolveSelectorElements(entryMeta, '.root::mid::base');

        expect(elements1[0]).to.eql([
            {
                type: 'class',
                name: 'root',
                resolved: [
                    {
                        meta: entryMeta,
                        symbol: entryMeta.classes.root,
                        _kind: 'css',
                    },
                    {
                        meta: midMeta,
                        symbol: midMeta.classes.root,
                        _kind: 'css',
                    },
                    {
                        meta: baseMeta,
                        symbol: baseMeta.classes.root,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'base',
                resolved: [
                    {
                        meta: baseMeta,
                        symbol: baseMeta.classes.base,
                        _kind: 'css',
                    },
                ],
            },
        ]);
        expect(elements2[0]).to.eql([
            {
                type: 'class',
                name: 'root',
                resolved: [
                    {
                        meta: entryMeta,
                        symbol: entryMeta.classes.root,
                        _kind: 'css',
                    },
                    {
                        meta: midMeta,
                        symbol: midMeta.classes.root,
                        _kind: 'css',
                    },
                    {
                        meta: baseMeta,
                        symbol: baseMeta.classes.root,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'mid',
                resolved: [
                    {
                        meta: midMeta,
                        symbol: midMeta.classes.mid,
                        _kind: 'css',
                    },
                    {
                        meta: baseMeta,
                        symbol: baseMeta.classes.root,
                        _kind: 'css',
                    },
                ],
            },
            {
                type: 'pseudo-element',
                name: 'base',
                resolved: [
                    {
                        meta: baseMeta,
                        symbol: baseMeta.classes.base,
                        _kind: 'css',
                    },
                ],
            },
        ]);
    });
});
