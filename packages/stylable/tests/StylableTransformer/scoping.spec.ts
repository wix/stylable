import { expect } from "chai";
import * as postcss from "postcss";
import { generateFromConfig } from "../utils/generate-test-util";

describe('Stylable postcss transform (Scoping)', function () {

    describe('scoped elements', function () {

        it('component/tag selector with first Capital letter automatically extend reference with identical name', () => {

            var result = generateFromConfig({
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

            expect((<postcss.Rule>result.nodes![0]).selector).to.equal('.ns--root .ns1--root');
            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.ns--root .ns1--root');

        });

    })

    describe('scoped pseudo-elements', function () {

        it('component/tag selector that extends root with inner class targeting', () => {

            var result = generateFromConfig({
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

            expect((<postcss.Rule>result.nodes![0]).selector).to.equal('.ns--root .ns1--root .ns1--inner');
            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.ns--root .ns1--root .ns1--inner .ns2--deep');
        });

        it('class selector that extends root with inner class targeting (deep)', () => {

            var result = generateFromConfig({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "inner.st.css";
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


            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.ns--root .ns--app.ns1--root .ns1--inner');
            expect((<postcss.Rule>result.nodes![2]).selector).to.equal('.ns--root .ns--app.ns1--root .ns1--inner .ns2--deep');

        });

        it('resolve and transform pseudo-element from deeply extended type', () => {

            var result = generateFromConfig({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "inner.st.css";
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


            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.ns--root .ns--app.ns1--root .ns2--deep');

        });
        
        it('resolve and transform pseudo-element from deeply override rather then extended type', () => {

            var result = generateFromConfig({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'ns',
                        content: `
                            :import {
                                -st-from: "inner.st.css";
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


            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.ns--root .ns--app.ns1--root .ns1--deep');

        });
     
        it('resolve and transform pseudo-element on root - prefer inherited element to override', () => {

            var result = generateFromConfig({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "inner.st.css";
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

            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.entry--root.inner--root .inner--inner, .entry--root .entry--inner');

        });

    })

    describe('scoped classes', function () {


        it('scope local classes', () => {

            var result = generateFromConfig({
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

            expect((<postcss.Rule>result.nodes![0]).selector).to.equal('.entry--root .entry--a');
            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.entry--root .entry--b, .entry--root .entry--c');
            expect((<postcss.Rule>result.nodes![2]).selector).to.equal('.entry--root .entry--d .entry--e');

        });

        it('scope local root class', () => {

            var result = generateFromConfig({
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

            expect((<postcss.Rule>result.nodes![0]).selector).to.equal('.entry--root');
            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.entry--root .entry--a');
            expect((<postcss.Rule>result.nodes![2]).selector).to.equal('.entry--root .entry--b, .entry--root .entry--c');

        });

        it('scope selector that extends local root', () => {

            var result = generateFromConfig({
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

            expect((<postcss.Rule>result.nodes![0]).selector).to.equal('.entry--a.entry--root');

        });

        it('scope selector that extends anther style', () => {

            var result = generateFromConfig({
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
                        content: '',
                    }
                }
            });

            expect((<postcss.Rule>result.nodes![0]).selector).to.equal('.entry--root .entry--a.imported--root');

        });


        it('scope class alias', () => {

            var result = generateFromConfig({
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
                        `,
                    }
                }
            });

            expect((<postcss.Rule>result.nodes![0]).selector, 'root alias').to.equal('.entry--root .imported--root');
            expect((<postcss.Rule>result.nodes![1]).selector, 'class alias').to.equal('.entry--root .imported--inner-class');

        });


        it('scope selector that extends local class', () => {

            var result = generateFromConfig({
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

            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.ns--root .ns--b.ns--a');

        });

        it('extends class form imported sheet', () => {

            var result = generateFromConfig({
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
                    `,
                    }
                }
            });

            expect((<postcss.Rule>result.nodes![0]).selector).to.equal('.ns--root .ns--a.ns1--b');

        });

    })

    describe('scoped states', function(){
        
        it('custom states inline', () => {

            var result = generateFromConfig({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .my-class { 
                                -st-states: my-state;
                            }
                            .my-class:my-state {}
                        `
                    }
                }
            });

            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.entry--root .entry--my-class[data-entry-my-state]');

        }); 

        it('custom states with mapping', () => {

            var result = generateFromConfig({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            .my-class { 
                                -st-states: my-state(".x"), my-other-state("  .y[data-z=\"value\"]  ");
                            }
                            .my-class:my-state {} 
                            .my-class:my-other-state {}
                        `
                    }
                }
            });

            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.entry--root .entry--my-class.x');
            expect((<postcss.Rule>result.nodes![2]).selector).to.equal('.entry--root .entry--my-class.y[data-z="value"]');

        }); 

        it('custom states from imported type', () => {

            var result = generateFromConfig({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .my-class { 
                                -st-extends: Inner;
                            }
                            .my-class:my-state {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .root { 
                                -st-states: my-state;
                            }
                        `
                    }
                }
            });

            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.entry--root .entry--my-class.inner--root[data-inner-my-state]');
            

        });        

        it('custom states from deep imported type', () => {

            var result = generateFromConfig({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .my-class { 
                                -st-extends: Inner;
                            }
                            .my-class:my-state {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
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
                        namespace: 'deep',
                        content: `
                            .root { 
                                -st-states: my-state;
                            }
                        `
                    }
                }
            });

            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.entry--root .entry--my-class.inner--root[data-deep-my-state]');
            

        });        



        it('custom states form imported type on inner pseudo-class', () => {

            var result = generateFromConfig({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import {
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .my-class { 
                                -st-extends: Inner;
                            }
                            .my-class::container:my-state {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            .container { 
                                -st-states: my-state;
                            }
                        `
                    }
                }
            });

            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.entry--root .entry--my-class.inner--root .inner--container[data-inner-my-state]');
            

        });        

        
        
        it('custom states form imported type on inner pseudo-class deep', function () {

            var result = generateFromConfig({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            :import{
                                -st-from: "./inner.st.css";
                                -st-default: Inner;
                            }
                            .my-class { 
                                -st-extends: Inner;
                            }
                            .my-class::container:my-state {}
                        `
                    },
                    '/inner.st.css': {
                        namespace: 'inner',
                        content: `
                            :import {
                                -st-from: "./deep.st.css";
                                -st-default: Deep;
                            }
                            .root {

                            }
                            .container { 
                                -st-extends: Deep;
                            }
                        `
                    },
                    '/deep.st.css': {
                        namespace: 'deep',
                        content: `
                            .root { 
                                -st-states: my-state;
                            }
                        `
                    }
                }
            });

            expect((<postcss.Rule>result.nodes![1]).selector).to.equal('.entry--root .entry--my-class.inner--root .inner--container[data-deep-my-state]');
   

        });


    })

    describe('@media scoping', function(){

        it('handle scoping inside media queries', () => {

            var result = generateFromConfig({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                            @media (max-width: 300px) {
                                .my-class { 
                                    -st-states: my-state;
                                }
                                .my-class:my-state {}
                            }
                        `
                    }
                }
            });

            const mediaNode = <postcss.AtRule>result.nodes![0];
            
            expect((<postcss.Rule>mediaNode.nodes![0]).selector).to.equal('.entry--root .entry--my-class');
            expect((<postcss.Rule>mediaNode.nodes![1]).selector).to.equal('.entry--root .entry--my-class[data-entry-my-state]');

        }); 

    })

    
    describe('@keyframes scoping', function () {
        it('scope animation and animation name', () => {

            var result = generateFromConfig({
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

            expect((<postcss.AtRule>result.nodes![0]).params).to.equal('entry--name');
            expect((<postcss.AtRule>result.nodes![1]).params).to.equal('entry--name2');
            expect((<postcss.Rule>result.nodes![2]).nodes![0].toString()).to.equal('animation: 2s entry--name infinite, 1s entry--name2 infinite');
            expect((<postcss.Rule>result.nodes![2]).nodes![1].toString()).to.equal('animation-name: entry--name');
           
        }); 

    })


});

