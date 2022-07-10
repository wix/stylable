import { expect } from 'chai';
import type * as postcss from 'postcss';
import { testStylableCore, generateStylableRoot, testInlineExpects } from '@stylable/core-test-kit';
import { createWarningRule } from '@stylable/core/dist/helpers/rule';

describe('Stylable postcss transform (Scoping)', () => {
    describe('scoped pseudo-classes', () => {
        it('should scope selector list when the anchor is not root', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'style',
                        content: `
                        @st-import Btn from "./button.st.css";

                        .a {
                            -st-extends: Btn;
                            -st-states: b, c;
                        } 

                        /* @check .style__a:is(.button__label, .button__icon, .style--b, .style--c) */
                        .a:is(::label, ::icon, :b, :c) {}
                        `,
                    },
                    '/button.st.css': {
                        namespace: 'button',
                        content: `
                        .label {}
                        .icon {}
                        `,
                    },
                },
            });

            testInlineExpects(result);
        });
        it('should transform pseudo-element chain inside nested pseudo-classes', () => {
            testStylableCore({
                '/style.st.css': `
                    @st-import Btn from "./button.st.css";

                    /* @rule(single) :is(.button__root .button__label) */
                    :is(Btn::label) {}

                    /* @rule(multi) :is(.button__root .button__label, .button__root .button__icon) */
                    :is(Btn::label, Btn::icon) {}

                    /* @rule(nested) :is(:where(.button__root .button__label)) */
                    :is(:where(Btn::label)) {}
                `,
                '/button.st.css': `
                    .label {}
                    .icon {}
                `,
            });
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
    });

    describe('scoped pseudo-elements', () => {
        it('should perserve native elements and its native pseudo element', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            /* @check header::before */
                            header::before {}
                            /* @check div::after */
                            div::after {}
                            /* @check form::focused */
                            form::focused {}
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .ns1__root .ns1__inner */
                            Container::inner {}
                            /* @check .ns1__root .ns1__inner .ns2__deep */
                            Container::inner::deep {}
                        `,
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
                        `,
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .ns__app .ns1__inner */
                            .app::inner {}
                            /* @check .ns__app .ns1__inner .ns2__deep */
                            .app::inner::deep {}
                        `,
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
                        `,
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                        `,
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                        `,
                    },
                },
                mode: 'development',
            });

            expect((result.nodes[0] as postcss.Rule).selector).to.equal('.ns__root');
            expect((result.nodes[1] as postcss.Rule).selector).to.equal(
                '.ns__root:not(.ns1__root)::before'
            );

            (
                createWarningRule(
                    'root',
                    'ns1__root',
                    'inner.st.css',
                    'root',
                    'ns__root',
                    'style.st.css'
                ).nodes as postcss.Declaration[]
            ).forEach((decl: postcss.Declaration, index: number) => {
                expect(
                    ((result.nodes[1] as postcss.Rule).nodes[index] as postcss.Declaration).prop
                ).to.eql(decl.prop);
                expect(
                    ((result.nodes[1] as postcss.Rule).nodes[index] as postcss.Declaration).value
                ).to.eql(decl.value);
            });
            expect(result.nodes.length).to.equal(2);
        });

        it('should add a warning rule while in development mode that targets a broken inheritance structure (deep import)', () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'style',
                        content: `
                            :import {
                                -st-from: "./index.st.css";
                                -st-named: Inner;
                            }
                            .root {
                                -st-extends: Inner;
                            }
                        `,
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                        `,
                    },
                    '/index.st.css': {
                        namespace: 'index',
                        content: `
                            :import {
                                -st-from: './inner.st.css';
                                -st-default: Inner;
                            }
                            .root Inner {}
                        `,
                    },
                },
                mode: 'development',
            });

            expect((result.nodes[0] as postcss.Rule).selector).to.equal('.style__root');
            expect((result.nodes[1] as postcss.Rule).selector).to.equal(
                '.style__root:not(.inner__root)::before'
            );

            (
                createWarningRule(
                    'root',
                    'inner__root',
                    'inner.st.css',
                    'root',
                    'style__root',
                    'style.st.css'
                ).nodes as postcss.Declaration[]
            ).forEach((decl: postcss.Declaration, index: number) => {
                expect(
                    ((result.nodes[1] as postcss.Rule).nodes[index] as postcss.Declaration).prop
                ).to.eql(decl.prop);
                expect(
                    ((result.nodes[1] as postcss.Rule).nodes[index] as postcss.Declaration).value
                ).to.eql(decl.value);
            });
            expect(result.nodes.length).to.equal(2);
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
                        }`,
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
                        `,
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: `
                        `,
                    },
                },
                mode: 'development',
            });

            expect((result.nodes[0] as postcss.Rule).selector).to.equal('.entry__root');
            expect(result.nodes.length).to.equal(1);
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
                        `,
                    },
                    '/inner.st.css': {
                        namespace: 'ns1',
                        content: `
                            .root1 {
                                color: green;
                            }
                        `,
                    },
                },
                mode: 'production',
            });

            expect((result.nodes[0] as postcss.Rule).selector).to.equal('.ns__root');
            expect(result.nodes.length).to.equal(1);
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
                            /* @check .ns__app:hover .ns1__inner */
                            .app:hover::inner {}
                        `,
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
                        `,
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .root {

                            }
                            .deep {

                            }
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .ns__app .ns2__deep */
                            .app::deep {}
                        `,
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
                        `,
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .ns__app .ns1__deep */
                            .app::deep {}
                        `,
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
                        `,
                    },
                    '/deep.st.css': {
                        namespace: 'ns2',
                        content: `
                            .deep {}
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .entry__root .inner__inner, .entry__inner */
                            .root::inner, .inner { }
                        `,
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .inner {}
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .x */
                            Inner {}
                            /* @check .x .y */
                            Inner::a {}
                        `,
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .root { -st-global: ".x";}
                            .a { -st-global: ".y";}
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .Inner__root .Inner__deep .Deep__up */
                            Inner::deep::up { }
                        `,
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
                        `,
                    },
                    '/deep.st.css': {
                        namespace: 'Deep',
                        content: `
                            .root {}
                            .up{}
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .entry__x .Deep__y */
                            .x::y {}
                        `,
                    },
                    '/inner.st.css': {
                        namespace: 'Inner',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-named: y;
                            }
                            .y {}
                        `,
                    },
                    '/deep.st.css': {
                        namespace: 'Deep',
                        content: `
                            .y{}
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .entry__root .Deep__x.Comp--hovered */
                            .root::option:hovered {
                                z-index: 1;
                            }
                            /* @check .entry__root .Deep__x .Comp__y.Y--hovered */
                            .root::optionY:hovered {
                                z-index: 2;
                            }
                        `,
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
                        `,
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
                    `,
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
                        `,
                    },
                    '/y.st.css': {
                        namespace: 'Y',
                        content: `
                        .root {
                            -st-states:hovered;
                        }
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .ns4__gaga .ns1__deep */
                            .gaga::deep {
                                color: gold;
                            }
                            /* @check .ns4__gaga .ns1__deep .ns0__deepest */
                            .gaga::deep::deepest {
                                color: gold;
                            }
                            .deep {} /* should not pick this class */
                        `,
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
                        `,
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
                        `,
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
                        `,
                    },
                    '/inner0.st.css': {
                        namespace: 'ns0',
                        content: `
                            .deepest {
                                color: red;
                            }
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check[1] .style__root .comp__partA, .style__root .comp__partB */
                            .root {
                                -st-mixin: Variant;
                            }
                        `,
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
                        `,
                    },
                    '/comp.st.css': {
                        namespace: 'comp',
                        content: `
                            .partA {}
                            .partB {}
                        `,
                    },
                },
            });

            testInlineExpects(result);
        });
    });

    describe('scoped classes', () => {
        it('scope selector that extends local root', () => {
            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            /* @check .entry__a */
                            .a {
                                -st-extends: root;
                            }
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                        `,
                    },
                },
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
                            /* @check .entry__a */
                            .a {
                                -st-extends: Imported;
                            }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: '',
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .entry__a */
                            .a {
                                -st-extends: Imported;
                            }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .root {
                                -st-global: ".x";
                            }
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check(root alias) .imported__root */
                            .Imported{}
                            /* @check(class alias) .imported__inner-class */
                            .inner-class{}
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .inner-class {

                            }
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check(class alias) .entry__inner-class */
                            .inner-class{
                                -st-extends: inner-class
                            }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'imported',
                        content: `
                            .inner-class {

                            }
                        `,
                    },
                },
            });

            testInlineExpects(result);
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

                            /* @check(class alias) .imported__inner-class .base__base */
                            .inner-class::base {

                            }
                        `,
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
                        `,
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .base {

                            }
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .ns__b */
                            .b {
                                -st-extends: a;
                            }
                        `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .ns__a */
                            .a {
                                -st-extends: b;
                            }
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: `
                        .b {

                        }
                    `,
                    },
                },
            });

            testInlineExpects(result);
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
                            /* @check .ns__b */
                            .b {}
                        `,
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: `

                    `,
                    },
                },
            });

            testInlineExpects(result);
        });
    });
});
