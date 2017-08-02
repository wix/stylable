import { expect } from "chai";
import { defineStylableEnv, CSS } from "./stylable-test-kit";

describe('static Generator variants', () => {

    describe('definition', () => {

        it('should not mark normal CSS classes as variants', () => {
            const env = defineStylableEnv([
                CSS('./main.css', 'Main', `
                    .MyCompClassNotVariant { 
                        color: red;                
                    }
                `)
            ], {});

            env.validate.stylesheet('./main.css').variant('MyCompClassNotVariant', false);
        });

        it('should not output typed variant to CSS', () => {
            const env = defineStylableEnv([
                CSS('./comp-a.css', 'CompA', ``),
                CSS('./main.css', 'Main', `
                    :import {
                        -st-from: "./comp-a.css";
                        -st-default: MyCompA;
                    }
                    .MyCompVariant { 
                        -st-extends: MyCompA;
                        -st-variant: true;
                        color: red;                
                    }
                `)
            ], {});

            env.validate.output([]);
        });

        it('should not output inline variant to CSS', () => {
            const env = defineStylableEnv([
                CSS('./main.css', 'Main', `
                    .MyCompVariant { 
                        -st-variant: true;
                        color: red;                
                    }
                `)
            ], {});

            env.validate.output([]);
            env.validate.stylesheet('./main.css').variant('MyCompVariant', true);
        });

        it('should not output any variant selector to CSS', () => {
            const env = defineStylableEnv([
                CSS('./main.css', 'Main', `
                    .MyCompVariant { 
                        -st-variant: true;
                        color: red;                
                    }
                    .MyCompVariant:hover { color: green; }
                    .MyCompVariant .x { color: green; }
                `)
            ], {});

            env.validate.output([]);
            env.validate.stylesheet('./main.css').variant('MyCompVariant', true);
        });

    });

    describe('with -st-mixin', () => {

        it('should output variant to simple class', () => {
            const env = defineStylableEnv([
                CSS('./comp-a.css', 'CompA', `
                    .MyCompVariant { 
                        -st-variant: true;
                        color: red;                
                    }
                `),
                CSS('./main.css', 'Main', `
                    :import {
                        -st-from: "./comp-a.css";
                        -st-named: MyCompVariant;
                    }
                    .classA { 
                        -st-mixin: MyCompVariant;
                    }
                `)
            ], {});
           
            env.validate.output([
                '.Main__classA {\n    color: red\n}'
            ]);
        });

        it('should apply variant to another variant', () => {
            const env = defineStylableEnv([
                CSS('./comp-a.css', 'CompA', `
                    .MyCompVariant { 
                        -st-variant: true;
                        color: red;                
                    }
                `),
                CSS('./main.css', 'Main', `
                    :import {
                        -st-from: "./comp-a.css";
                        -st-named: MyCompVariant;
                    }
                    .classA {
                        -st-variant: true;
                        -st-mixin: MyCompVariant;
                    }
                `)
            ], {})

            env.validate.output([]);
            env.validate.stylesheet('./comp-a.css').variant('MyCompVariant', true);
            env.validate.stylesheet('./main.css').variant('classA', true);
        });

        it('should output multiple-selector variant', () => {
            const env = defineStylableEnv([
                CSS('./comp-a.css', 'CompA', `
                    .MyCompVariant { 
                        -st-variant: true;
                        color: red;                
                    }
                    .MyCompVariant:hover {
                        color: green;
                    }
                `),
                CSS('./main.css', 'Main', `
                    :import {
                        -st-from: "./comp-a.css";
                        -st-named: MyCompVariant;
                    }
                    .classA { 
                        -st-mixin: MyCompVariant;
                    }
                `)
            ], {});

            env.validate.output([
                '.Main__classA {\n    color: red\n}',
                '.Main__classA:hover {\n    color: green\n}'
            ]);
        });

        it('should scope variant to origin', () => {
            const env = defineStylableEnv([
                CSS('./comp-a.css', 'CompA', `
                    .MyCompVariant { 
                        -st-states: xxx;
                        -st-variant: true;
                        color: red;                
                    }
                    .MyCompVariant .x {
                        color: green;
                    }
                    .MyCompVariant:xxx {
                        color: blue;
                    }
                `),
                CSS('./main.css', 'Main', `
                    :import {
                        -st-from: "./comp-a.css";
                        -st-named: MyCompVariant;
                    }
                    .classA { 
                        -st-mixin: MyCompVariant;
                    }
                `)
            ], {});

            env.validate.output([
                '.Main__classA {\n    color: red\n}',
                '.Main__classA .CompA__x {\n    color: green\n}',
                '.Main__classA[data-compa-xxx] {\n    color: blue\n}'
            ]);
        });

    });
    
});
