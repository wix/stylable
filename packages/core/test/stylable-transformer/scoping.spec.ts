import { generateStylableRoot } from '@stylable/core-test-kit';
import { expect } from 'chai';
import postcss from 'postcss';
import { createWarningRule } from '../../src';

describe('Stylable postcss transform (Scoping)', () => {
    describe('scoped pseudo-elements', () => {
        it('should perserve native elements and its native pseudo element', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            header::before {}
                            div::after {}
                            form::focused {}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('header::before');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('div::after');
            expect((result.nodes![2] as postcss.Rule).selector).to.equal('form::focused');
        });

        it('component/tag selector that extends root with inner class targeting', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            Container::inner {}
                            Container::inner::deep {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .inner {
                                -st-extends: Deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.ns1__root .ns1__inner');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal(
                '.ns1__root .ns1__inner .ns2__deep'
            );
        });

        it('component/tag selector with -st-global', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            Container {}

                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            .root {
                                -st-global: ".x";
                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.x');
        });

        it('class selector that extends root with inner class targeting (deep)', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            .app {
                                -st-extends: Container;
                            }
                            .app::inner {}
                            .app::inner::deep {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .inner {
                                -st-extends: Deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns__app .ns1__inner');
            expect((result.nodes![2] as postcss.Rule).selector).to.equal(
                '.ns__app .ns1__inner .ns2__deep'
            );
        });

        it('should add a warning rule while in development mode that targets a broken inheritance structure', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .root {
                                -st-extends: Inner;
                            }
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                        `
                    }
                },
                mode: 'development'
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.ns__root');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal(
                '.ns__root:not(.ns1__root)::before'
            );
            // tslint:disable:max-line-length
            (createWarningRule(
                'root',
                'ns1__root',
                'inner.st.css',
                'root',
                'ns__root',
                'style.st.css'
            ).nodes as postcss.Declaration[]).forEach(
                (decl: postcss.Declaration, index: number) => {
                    expect(
                        ((result.nodes![1] as postcss.Rule).nodes![index] as postcss.Declaration)
                            .prop
                    ).to.eql(decl.prop);
                    expect(
                        ((result.nodes![1] as postcss.Rule).nodes![index] as postcss.Declaration)
                            .value
                    ).to.eql(decl.value);
                }
            );
            expect(result.nodes!.length).to.equal(2);
        });

        it('should not add a warning rule while in development when apply with mixin', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: "./variant.st.css";
                            -st-default: Variant;
                        }
                        .root {
                            -st-mixin: Variant;
                        }`
                    },
                    '/variant.st.css': {
                        namespace: 'variant',
                        content: `
                            :import {
                                -st-from: "./comp.st.css";
                                -st-default: Comp;
                            }
                            .root {
                                -st-extends: Comp;
                            }
                        `
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: `
                        `
                    }
                },
                mode: 'development'
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.entry__root');
            expect(result.nodes!.length).to.equal(1);
        });

        it('should NOT add a warning rule while in production mode', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-named: root1;
                            }
                            .root {
                                -st-extends: root1;
                            }
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            .root1 {
                                color: green;
                            }
                        `
                    }
                },
                mode: 'production'
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.ns__root');
            expect(result.nodes!.length).to.equal(1);
        });

        it('class selector that extends root uses pseudo-element after pseudo-class', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            .app {
                                -st-extends: Container;
                            }
                            .app:hover::inner {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./base.st.css";
                                -st-default: Base;
                            }
                            .root {
                                -st-extends: Base
                            }
                            .inner {

                            }
                        `
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .root {

                            }
                            .deep {

                            }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal(
                '.ns__app:hover .ns1__inner'
            );
        });

        it('resolve and transform pseudo-element from deeply extended type', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .app {
                                -st-extends: Inner;
                            }
                            .app::deep {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .root {
                                -st-extends: Deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns__app .ns2__deep');
        });

        it('resolve and transform pseudo-element from deeply override rather then extended type', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Container;
                            }
                            .app {
                                -st-extends: Container;
                            }
                            .app::deep {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .root {
                                -st-extends: Deep;
                            }
                            .deep {}
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns__app .ns1__deep');
        });

        it('resolve and transform pseudo-element on root - prefer inherited element to override', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .root {
                                -st-extends: Inner;
                            }
                            .root::inner, .inner { }
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .inner {}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal(
                '.entry__root .inner__inner, .entry__inner'
            );
        });

        it('resolve and transform pseudo-element with -st-global output', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            Inner {}
                            Inner::a {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .root { -st-global: ".x";}
                            .a { -st-global: ".y";}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.x');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.x .y');
        });

        it('resolve extend on extended alias', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            Inner::deep::up { }
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'Inner',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: deep;
                            }
                            .deep {
                                -st-extends: deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'Deep',
                        content: `
                            .root {}
                            .up{}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal(
                '.Inner__root .Inner__deep .Deep__up'
            );
        });

        it('resolve aliased pseudo-element', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .x {
                                -st-extends: Inner;
                            }
                            .x::y {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'Inner',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-named: y;
                            }
                            .y {}
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'Deep',
                        content: `
                            .y{}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.entry__x .Deep__y');
        });

        it('resolve aliased pseudo-element (with @custom-selector )', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .root {
                                -st-extends: Inner;
                            }
                            .root::option:hovered {
                                z-index: 1;
                            }
                            .root::optionY:hovered {
                                z-index: 2;
                            }
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'Inner',
                        content: `
                            @custom-selector :--option .root::x;
                            @custom-selector :--optionY .root::x::y;
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .root {
                                -st-extends: Deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'Deep',
                        content: `
                        :import {
                            -st-from: "./comp.st.css";
                            -st-default: Comp;
                        }
                        .x{
                            -st-extends: Comp;
                        }
                    `
                    },
                    '/comp.st.css': {
                        namespace: 'Comp',
                        content: `
                        :import {
                            -st-from: "./y.st.css";
                            -st-default: Y;
                        }
                        .root {
                            -st-states:hovered;
                        }
                        .y {
                            -st-extends: Y;
                        }
                        `
                    },
                    '/y.st.css': {
                        namespace: 'Y',
                        content: `
                        .root {
                            -st-states:hovered;
                        }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal(
                '.entry__root .Deep__x.Comp--hovered'
            );
            expect((result.nodes![2] as postcss.Rule).selector).to.equal(
                '.entry__root .Deep__x .Comp__y.Y--hovered'
            );
        });

        it('resolve inner part that is a @custom-selector (with multiple selectros) in nested-pseudo-class', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .root {
                                -st-extends: Inner;
                            }
                            .root :not(::option){
                                z-index: 1;
                            }
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'Inner',
                        content: `
                            @custom-selector :--option .a, .b ;
                            
                            .root {
                                
                            }
                            .a{}
                            .b{}
                            .option{}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal(
                '.entry__root :not( .Inner__a), .entry__root :not( .Inner__b)'
            );
        });
        

        it('should only lookup in the extedns chain', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns4',
                        content: `
                            :import {
                                -st-from: "./inner3.st.css";
                                -st-named: midClass;
                            }
                            .gaga {
                                -st-extends: midClass;
                            }
                            .gaga::deep {
                                color: gold;
                            }
                            .gaga::deep::deepest {
                                color: gold;
                            }
                            .deep {} /* should not pick this class */
                        `
                    },
                    '/inner3.st.css': {
                        namespace: 'ns3',
                        content: `
                            :import {
                                -st-from: "./inner2.st.css";
                                -st-named: deepClass;
                            }
                            .midClass {
                                -st-extends: deepClass;
                            }
                            .deep {} /* should not pick this class */
                        `
                    },
                    '/inner2.st.css': {
                        namespace: 'ns2',
                        content: `
                            :import {
                                -st-from: "./inner1.st.css";
                                -st-default: Comp;
                            }
                            .deepClass {
                                -st-extends: Comp;
                            }
                            .deep {} /* should not pick this class */
                        `
                    },
                    '/inner1.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./inner0.st.css";
                                -st-default: Comp;
                            }
                            .root {
                                
                            }
                            .deep {
                                -st-extends: Comp;
                                color: beige;
                            }
                        `
                    },
                    '/inner0.st.css': {
                        namespace: 'ns0',
                        content: `
                            .deepest {
                                color: red;
                            }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns4__gaga .ns1__deep');
            // tslint:disable-next-line:max-line-length
            expect((result.nodes![2] as postcss.Rule).selector).to.equal('.ns4__gaga .ns1__deep .ns0__deepest');

        });

        it('should scope multiple selectors with a pseudo element passed through a mixin', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'style',
                        content: `
                            :import {
                                -st-from: "./variant.st.css";
                                -st-default: Variant;
                            }
                            .root {
                                -st-mixin: Variant;
                            }
                        `
                    },
                    '/variant.st.css': {
                        namespace: 'variant',
                        content: `
                            :import {
                                -st-from: "./comp.st.css";
                                -st-default: Comp;
                            }
                            .root {
                                -st-extends: Comp;
                            }
                            .root::partA, .root::partB {}
                        `
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: `
                            .partA {}
                            .partB {}
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.style__root .comp__partA, .style__root .comp__partB');
        });
    });

    describe('scoped classes', () => {
        it('scope local classes', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .a {}
                            .b, .c {}
                            .d .e {}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.entry__a');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.entry__b, .entry__c');
            expect((result.nodes![2] as postcss.Rule).selector).to.equal('.entry__d .entry__e');
        });

        it('scope local root class', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {}
                            .root .a {}
                            .root .b, .c{}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.entry__root');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.entry__root .entry__a');
            expect((result.nodes![2] as postcss.Rule).selector).to.equal(
                '.entry__root .entry__b, .entry__c'
            );
        });

        it('scope according to -st-global', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                -st-global: ".x";
                            }
                            .a {
                                -st-global: ".y";
                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.x');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.y');
        });

        it('scope according to -st-global complex chunk', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .root {
                                -st-global: ".x.y";
                            }
                            .a {
                                -st-global: ".z";
                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.x.y');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.z');
        });

        it('scope selector that extends local root', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .a {
                                -st-extends: root;
                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.entry__a');
        });

        it.skip('TODO: fix it. scope selector that extends local root', () => {
            generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .a, .b {
                                -st-extends: root;
                            }
                        `
                    }
                }
            });
        });

        it('scope selector that extends anther style', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-default: Imported;
                            }
                            .a {
                                -st-extends: Imported;
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: ''
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.entry__a');
        });

        it('scope selector that extends a style with -st-global root', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-default: Imported;
                            }
                            .a {
                                -st-extends: Imported;
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .root {
                                -st-global: ".x";
                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.entry__a');
        });

        it('scope class alias', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-default: Imported;
                                -st-named: inner-class;
                            }

                            .Imported{}
                            .inner-class{}
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .inner-class {

                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector, 'root alias').to.equal(
                '.imported__root'
            );
            expect((result.nodes![1] as postcss.Rule).selector, 'class alias').to.equal(
                '.imported__inner-class'
            );
        });

        it('scope class alias that also extends', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-default: Imported;
                                -st-named: inner-class;
                            }
                            .inner-class{
                                -st-extends: inner-class
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .inner-class {

                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector, 'class alias').to.equal(
                '.entry__inner-class'
            );
        });

        it('scope class alias that extends and have pseudo elements ', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-named: inner-class;
                            }

                            .inner-class::base {

                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            :import{
                                -st-from: "./base.st.css";
                                -st-default: Base;
                            }
                            .inner-class {
                                -st-extends: Base;
                            }
                        `
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .base {

                            }
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector, 'class alias').to.equal(
                '.imported__inner-class .base__base'
            );
        });

        it('scope selector that extends local class', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            .a {

                            }
                            .b {
                                -st-extends: a;
                            }
                        `
                    }
                }
            });

            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns__b');
        });

        it('extends class form imported sheet', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-named: b;
                            }
                            .a {
                                -st-extends: b;
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: `
                        .b {

                        }
                    `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.ns__a');
        });

        it('handle not existing imported class', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import{
                                -st-from: "./imported.st.css";
                                -st-named: b;
                            }
                            .b {}
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: `

                    `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.ns__b');
        });
    });

    describe('@keyframes scoping', () => {
        it('scope animation and animation name', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            @keyframes name {
                                from {}
                                to {}
                            }

                            @keyframes name2 {
                                from {}
                                to {}
                            }

                            .selector {
                                animation: 2s name infinite, 1s name2 infinite;
                                animation-name: name;
                            }

                        `
                    }
                }
            });
            expect((result.nodes![0] as postcss.AtRule).params).to.equal('entry__name');
            expect((result.nodes![1] as postcss.AtRule).params).to.equal('entry__name2');
            expect((result.nodes![2] as postcss.Rule).nodes![0].toString()).to.equal(
                'animation: 2s entry__name infinite, 1s entry__name2 infinite'
            );
            expect((result.nodes![2] as postcss.Rule).nodes![1].toString()).to.equal(
                'animation-name: entry__name'
            );
        });

        it('not scope rules that are child of keyframe atRule', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            @keyframes name {
                                from {}
                                to {}
                            }
                            @keyframes name2 {
                                0% {}
                                100% {}
                            }
                        `
                    }
                }
            });

            const at = result.nodes![0] as postcss.AtRule;
            expect((at.nodes![0] as postcss.Rule).selector).to.equal('from');
            expect((at.nodes![1] as postcss.Rule).selector).to.equal('to');

            const at1 = result.nodes![1] as postcss.AtRule;
            expect((at1.nodes![0] as postcss.Rule).selector).to.equal('0%');
            expect((at1.nodes![1] as postcss.Rule).selector).to.equal('100%');
        });
    });
});
