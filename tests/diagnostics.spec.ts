

const customButton = `
                    .root{
                        -st-states:shmover;
                    }
                    .my-part{

                    }
                    .my-variant{
                        -st-variant:true;
                        color:red;
                    }
                    
                `;

interface warning{
    message:string;
    file:string;
}
                    
function expectWarnings(src:string,warnings:warning | warning[]){
    console.log(src,warnings);
}

describe('diagnostics: warnings and errors',function(){

    describe('syntax',function(){

        describe('selectors',function(){
            it('should return warning for unterminated "."',function(){
                expectWarnings(`
                    .root{

                    }
                    .|
                `,{message:"indentifier expected",file:"main.css"});
            });
            it('should return warning for unterminated ":"',function(){
                expectWarnings(`
                    .root{

                    }
                    :|
                `,{message:"indentifier expected",file:"main.css"})
            });
            it('should return warning for className without rule area',function(){
                expectWarnings(`
                    .root{

                    }
                    .gaga|
                `,{message:"{ expected",file:"main.css"})
            });

        });
        describe('ruleset',function(){
            it('should return warning for unterminated ruleset',function(){
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color:red|
                `,{message:"; expected",file:"main.css"})
            });
        });
        describe('rules',function(){
            it('should return warning for unterminated rule',function(){
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color|
                    }
                `,{message:": expected",file:"main.css"})
                expectWarnings(`
                    .root{

                    }
                    .gaga{
                        color:|
                    }
                `,{message:"property value expected",file:"main.css"})
                // todo: add cases for any unterminated selectors (direct descendant, etc...)
            });
            it('should return warning for unknown rule',function(){
                expectWarnings(`
                    .root{
                        |hello|:yossi;
                    }
                `,{message:'unknown rule hello',file:"main.css"})
            });
            it('should return warning for unknown directive',function(){
                expectWarnings(`
                    .gaga{
                        |-st-something|:true;
                    }
                `,{message:'unknown directive "-st-something"',file:"main.css"})
            })
        });
        describe('states',function(){
            it('should return warning for state without selector',function(){
                expectWarnings(`
                    |:hover|{

                    }
                `,{message:"global states are not supported, use .root:hover instead",file:"main.css"})
            });

            it('should return warning for unknown state',function(){
                expectWarnings(`
                    .root:|shmover|{

                    }
                `,{message:"unknown state shmover",file:"main.css"})
            });
        });
        describe('pseudo selectors',function(){
            it('should return warning for native pseudo selectors  without selector',function(){
                expectWarnings(`
                    |::before|{

                    }
                `,{message:"global pseudo selectors are not allowed, you can use .root::before instead",file:"main.css"})
            });
    
            it('should return warning for unknown pseudo selector',function(){
                expectWarnings(`
                    .root::|mybtn|{

                    }
                `,{message:'unknow pseudo selector "mybtn"',file:"main.css"})
            });
        });
        
    })
    describe('structure',function(){

        describe('root',function(){
            it('should return warning for ".root" after selector',function(){
                expectWarnings(`
                    |.gaga .root|{

                    }
                    
                `,{message:'.root can only be used as the root of the component',file:"main.css"})
            });
        

        });
        describe('-st-states',function(){
            it('should return warning when defining states in complex selector',function(){
                expectWarnings(`
                    .gaga:hover{
                        |-st-states|:shmover;
                    }
                `,{message:'cannot define pseudo states inside complex selectors',file:"main.css"})
            });
        });
        describe('-st-mixin',function(){
            it('should return warning for unknown mixin',function(){
                expectWarnings(`
                    .gaga{
                        -st-mixin:|myMixin|;
                    }
                `,{message:'unknown mixin: "myMixin"',file:"main.css"})
            });
    
        });
        describe(':vars',function(){
            it('should return warning for unknown var',function(){
                expectWarnings(`
                    .gaga{
                        color:|value(myColor)|;
                    }
                `,{message:'unknown var "myColor"',file:"main.css"})
            });
    
            it('should return warning when defined in a complex selector',function(){
                expectWarnings(`
                    |.gaga:vars|{
                        myColor:red;
                    }
                    
                `,{message:'cannot define "vars" inside a complex selector',file:"main.css"})
            });
        });
        describe('-st-variant',function(){
            it('should return warning when defining variant in complex selector',function(){
                expectWarnings(`
                    .gaga:hover{
                        |-st-variant|:true;
                    }
                `,{message:'cannot define "-st-variant" inside complex selector',file:"main.css"})
            });
        });
        describe(':import',function(){
            it('should return warning for unknown file',function(){
                expectWarnings(`

                    :import{
                        -st-from:|"./file"|;
                        -st-default:Theme;
                    }
                `,{message:'could not find file "./file"',file:"main.css"})
            });
            it('should return warning when defined in a complex selector',function(){
                expectWarnings(`
                    |.gaga:import|{
                        -st-from:"./file";
                        -st-default:Theme;
                    }
                `,{message:'cannot define ":import" inside complex selector',file:"main.css"})
            })
            it('should return warning for unknown import',function(){
                expectWarnings(`

                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:|variant|;
                    }
                `,{message:'cannot find export "-st-variant" in "./file"',file:"main.css"})
                const file = customButton;
            });
            it('should return warning for non import rules inside imports',function(){
                expectWarnings(`

                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        |color|:red
                    }
                `,{message:'"color" css attribute cannot be used inside import block',file:"main.css"})
                const file = customButton;
            });
            
        });

        describe('-st-extend',function(){
            it('should return warning when defined under complex selector',function(){
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                    }
                    .root:hover{
                        |-st-extend|:Comp;
                    }
                `,{message:'cannot define "-sb-extend" inside complex selector',file:"main.css"})

                const file = customButton
            });
        });
    });
    describe('complex examples',function(){
        describe('cross variance',function(){
            it('variant cannot be used as var',function(){
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    .root{
                        color:|value(my-variant)|;
                    }
                `,{message:'"my-variant" is a variant and cannot be used as a var',file:"main.css"})

                const file = customButton
            });
            it('mixin cannot be used as var',function(){
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-named:my-mixin;
                    }
                    .root{
                        color:|value(my-mixin)|;
                    }
                `,{message:'"my-mixin" is a mixin and cannot be used as a var',file:"main.css"})

                const file = customButton
            });
            it('mixin cannot be used as stylesheet',function(){
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-named:my-mixin;
                    }
                    .root{
                        -st-extend:|my-mixin|;
                    }
                `,{message:'"my-mixin" is a mixin and cannot be used as a stylesheet',file:"main.css"})

                const file = customButton
            });
            it('stylesheet cannot be used as var',function(){
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                    .root{
                        color:|value(Comp)|;
                    }
                `,{message:'"Comp" is a stylesheet and cannot be used as a var',file:"main.css"})

                const file = customButton
            });
            it('stylesheet cannot be used as mixin',function(){
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    .root{
                        -st-mixin:|Comp|;
                    }
                `,{message:'"Comp" is a stylesheet and cannot be used as a mixin',file:"main.css"})

                const file = customButton
            });
            it('component mixins cannot be used for native node',function(){
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    
                    .gaga{
                        -st-mixin:|my-variant|;
                    }
                `,{message:'"my-variant" cannot be applied to ".gaga", ".gaga" refers to a native node and "my-variant" can only be spplied to "@namespace of comp"',file:"main.css"})

                const file = customButton
            });
            it('mixins can only be used for a specific component',function(){
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    :import{
                        -st-from:"./file2";
                        -st-default:Comp2;
                        -st-named:my-variant2;
                    }
                    .gaga{
                        -st-extends:Comp;
                        -st-apply:|my-variant2|;
                    }
                `,{message:'"my-variant2" cannot be applied to ".gaga", ".gaga" refers to "@namespace of comp" and "my-variant" can only be spplied to "@namespace of Comp2"',file:"main.css"})

                const file = customButton
                const file2 = customButton
            });
            it('variant cannot be used with params',function(){
                expectWarnings(`
                    :import{
                        -st-from:"./file";
                        -st-default:Comp;
                        -st-named:my-variant;
                    }
                    .root{
                        -st-extend:Comp;
                        -st-mixin:|my-variant(param)|;
                    }
                `,{message:'invalid mixin arguments: "my-variant" is a variant and does not except arguments',file:"main.css"})

                const file = customButton
            });
            it('mixins cant be used with wrong number of params',function(){
                expectWarnings(`
                    :import{
                        -st-from:"./mixins";
                        -st-named:mixinWith2Args;
                    }
                    .root{
                        -st-mixin:|mixinWith2Args(param)|;
                    }
                `,{message:'invalid mixin arguments: "mixinWith2Args" expects 2 arguments but recieved 1',file:"main.css"})

            });

                it('error running mixin',function(){
                expectWarnings(`
                    :import{
                        -st-from:"./mixins";
                        -st-named:mixinThatExplodes;
                    }
                    .root{
                        -st-mixin:|mixinThatExplodes(param)|;
                    }
                `,{message:'"mixinThatExplodes" has thrown an error: error text',file:"main.css"})

            });
        });

                    
    });
});