import { expect } from 'chai';
import * as postcss from 'postcss';
import { expandCustomSelectors } from '../../src/stylable-utils';
import { createTransformer } from '../utils/generate-test-util';

describe('Stylable intellisense selector meta data', () => {

    it('resolve single class element', () => {

        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    content: `
                        .a {

                        }
                    `
                }
            }
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
                        _kind: 'css'
                    }
                ]
            }
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
                    `
                },
                '/other.st.css': {
                    content: `
                        .c {
                        }
                    `
                }
            }
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
                        _kind: 'css'
                    },
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.root,
                        _kind: 'css'
                    }
                ]
            },
            {
                type: 'pseudo-element',
                name: 'c',
                resolved: [
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.c,
                        _kind: 'css'
                    }
                ]
            }
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
                    `
                },
                '/other.st.css': {
                    content: `
                        .c {
                            -st-states: b;
                        }
                    `
                }
            }
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
                        _kind: 'css'
                    },
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.c,
                        _kind: 'css'
                    }
                ]
            },
            {
                type: 'pseudo-element',
                name: 'c',
                resolved: [
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.c,
                        _kind: 'css'
                    }
                ]
            }
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
                    `
                }
            }
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
                        _kind: 'css'
                    }
                ]
            }
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
                    `
                },
                '/comp.st.css': {
                    content: `
                    .lala {
                        -st-states: hello;
                    }

                    @custom-selector :--pongo .lala ;

                    `
                }
            }
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const otherMeta = t.fileProcessor.process('/comp.st.css');
        const elements = t.resolveSelectorElements(
            meta,
            '.x::pongo'
        );

        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'x',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.x,
                        _kind: 'css'
                    },
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.root,
                        _kind: 'css'
                    }
                ]
            },
            {
                type: 'pseudo-element',
                name: 'pongo',
                resolved: [
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.lala,
                        _kind: 'css'
                    }
                ]
            }
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
                    `
                },
                '/import.st.css': {
                    content: `
                    .shlomo {
                        color: black;
                    }
                    `
                }
            }
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
                        _kind: 'css'
                    },
                    {
                        meta: otherMeta,
                        symbol: otherMeta.classes.root,
                        _kind: 'css'
                    }
                ]
            }
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
                `
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
                    `
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
                    `
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
                    `
                },
                '/recursive-import.st.css': {
                    content: `
                    .root {}
                    `
                }

            }
        });

        const meta = t.fileProcessor.process('/entry.st.css');
        const recursive2 = t.fileProcessor.process('/recursive-import-2.st.css');
        const recursive1 = t.fileProcessor.process('/recursive-import-1.st.css');
        const recursive0 = t.fileProcessor.process('/recursive-import-0.st.css');
        const last = t.fileProcessor.process('/recursive-import.st.css');

        const elements = t.resolveSelectorElements(meta, '.gaga:lala::bobo:otherState:state::momo:anotherState');

        expect(elements[0]).to.eql([
            {
                type: 'class',
                name: 'gaga',
                resolved: [
                    {
                        meta,
                        symbol: meta.classes.gaga,
                        _kind: 'css'
                    },
                    {
                        meta: recursive2,
                        symbol: recursive2.classes.root,
                        _kind: 'css'
                    }
                ]
            },
            {
                type: 'pseudo-element',
                name: 'bobo',
                resolved: [
                    {
                        meta: recursive2,
                        symbol: recursive2.classes.bobo,
                        _kind: 'css'
                    },
                    {
                        meta: recursive1,
                        symbol: recursive1.classes.root,
                        _kind: 'css'
                    }
                ]
            },
            {
                type: 'pseudo-element',
                name: 'momo',
                resolved: [
                    {
                        meta: recursive1,
                        symbol: recursive1.classes.momo,
                        _kind: 'css'
                    },
                    {
                        meta: recursive0,
                        symbol: recursive0.classes.root,
                        _kind: 'css'
                    },
                    {
                        meta: last,
                        symbol: last.classes.root,
                        _kind: 'css'
                    }
                ]
            }
        ]);

    });

});
