import {expect} from 'chai';
import * as postcss from 'postcss';
import {generateStylableRoot} from '../utils/generate-test-util';

describe('Stylable transform elements', () => {

    describe('scoped elements', () => {

        // tslint:disable-next-line:max-line-length
        it('component/tag selector with first Capital letter automatically extends reference with identical name', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-default: Element;
                            }
                            Element {}
                            .root Element {}
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: ``
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.ns1--root');
            expect((result.nodes![1] as postcss.Rule).selector).to.equal('.ns--root .ns1--root');

        });

        // tslint:disable-next-line:max-line-length
        it('component/tag selector with first Capital letter automatically extend reference with identical name (inner parts)', () => {

            const result = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Element;
                            }
                            Element::part {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .part {}
                        `
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.inner--root .inner--part');

        });

        it('resolve imported element that is also root', () => {

            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "./imported.st.css";
                                -st-named: ButtonX;
                            }
                            .x {
                                -st-extends: ButtonX;
                            }
                        `
                    },
                    '/imported.st.css': {
                        namespace: 'ns1',
                        content: `
                            :import {
                                -st-from: "./button-x.st.css";
                                -st-default: ButtonX;
                            }
                            ButtonX{}
                        `
                    },
                    '/button-x.st.css': {
                        namespace: 'button-x',
                        content: ``
                    }
                }
            });

            expect((result.nodes![0] as postcss.Rule).selector).to.equal('.ns--x.button-x--root');

        });

        it('should resolve imported named element type when used as element', () => {
            const res = generateStylableRoot({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-named: Element;
                            }

                            Element {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            :import {
                                -st-from: "./base.st.css";
                                -st-default: Element;
                            }
                            Element {}
                        `
                    },
                    '/base.st.css': {
                        namespace: 'base',
                        content: `
                            .root {}
                        `
                    }
                }
            });

            expect((res.nodes![0] as postcss.Rule).selector).to.equal('.base--root');

        });
    });

});
