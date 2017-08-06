import { defineStylableEnv, CSS, JS } from "./utils/stylable-test-kit";


describe('static Generator mixins', function () {

    it('should add rules to the root selector', function () {
        const env = defineStylableEnv([
            JS('./relative/path/to/mixin.js', 'MixinJS', {
                default: function mixin(options: string[]) {
                    return {
                        color: options[0]
                    }
                }
            }),
            CSS('./main.css', 'Main', `
                :import("./relative/path/to/mixin.js") {
                    -st-default: MyMixin;
                }
                .container { 
                    -st-mixin: MyMixin(red);                
                }
            `)
        ], {});

        env.validate.output([
            '.Main__container {\n    color: red\n}'
        ]);
    });

    it('should add child selectors', function () {
        const env = defineStylableEnv([
            JS('./relative/path/to/mixin.js', 'MixinJS', {
                default: function mixin(options: string[]) {
                    return {
                        ':hover': {
                            color: options[0]
                        }
                    }
                }
            }),
            CSS('./main.css', 'Main', `
                :import("./relative/path/to/mixin.js") {
                    -st-default: MyMixin;
                }
                .container { 
                    -st-mixin: MyMixin(red);                
                }
            `)
        ], {});
        
        env.validate.output([
            '.Main__container {}',
            '.Main__container :hover {\n    color: red\n}'
        ]);
    });

    it('should add extended selectors (&) in the first level', function () {
        const env = defineStylableEnv([
            JS('./relative/path/to/mixin.js', 'MixinJS', {
                default: function mixin(options: string[]) {
                    return {
                        '&:hover': {
                            color: options[0]
                        }
                    }
                }
            }),
            CSS('./main.css', 'Main', `
                :import("./relative/path/to/mixin.js") {
                    -st-default: MyMixin;
                }
                .container { 
                    -st-mixin: MyMixin(red);                
                }
            `)
        ], {});
        
        env.validate.output([
            '.Main__container {}',
            '.Main__container:hover {\n    color: red\n}'
        ]);

    });

    it('should handle nested mixins', function () {
        function colorMixin(options: string[]) {
            return {
                color: options[0],
                "&:hover": {
                    color: options[1]
                }
            }
        }
        function mixin(options: string[]) {
            return {
                "& > *": {
                    background: options[0],
                    border: options[1],
                    ...colorMixin(['red', 'green'])
                },

            }
        }
        const env = defineStylableEnv([
            JS('./relative/path/to/mixin.js', 'MixinJS', {
                default: mixin
            }),
            CSS('./main.css', 'Main', `
                :import("./relative/path/to/mixin.js") {
                    -st-default: MyMixin;
                }
                .container { 
                    -st-mixin: MyMixin(red, 10px solid black);
                }
            `)
        ], {});
        
        env.validate.output([
            '.Main__container {}',
            '.Main__container > * {\n    background: red;\n    border: 10px solid black;\n    color: red\n}',
            '.Main__container > *:hover {\n    color: green\n}'
        ]); 
    });

});
