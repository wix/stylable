import * as chai from "chai";
import { generateStylableOutput } from "../utils/generate-test-util";

const expect = chai.expect;

describe('output theme', () => {

    it('should output theme from sheet marked for output', () => {
        const cssOutput = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-theme: true;
                            -st-from: "./theme.st.css";
                        }
                        .b { color:green; } 
                    `
                },
                "/theme.st.css": {
                    namespace: 'theme',
                    content: `
                        .a { color:red; }
                    `
                }
            }
        });

        expect(cssOutput).to.eql([
            '.theme--root .theme--a { color:red; }',
            '.entry--root .entry--b { color:green; }'
        ].join('\n'));
    });


    it('should output theme from sheet marked for output', () => {
        const cssOutput = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css',
                '/entry2.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-theme: true;
                            -st-from: "./theme.st.css";
                        }
                        .b { color:green; } 
                    `
                },
                "/entry2.st.css": {
                    namespace: 'entry2',
                    content: `
                        :import {
                            -st-theme: true;
                            -st-from: "./theme.st.css";
                        }
                        .b { color:green; } 
                    `
                },
                "/theme.st.css": {
                    namespace: 'theme',
                    content: `
                        .a { color:red; }
                    `
                }
            }
        });

        expect(cssOutput).to.eql([
            '.theme--root .theme--a { color:red; }',
            '.entry2--root .entry2--b { color:green; }',
            '.entry--root .entry--b { color:green; }'
        ].join('\n'));
    });


    it('should output theme from sheet marked for output', () => {
        const cssOutput = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css',
                '/comp.st.css',
                '/comp2.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-theme: true;
                            -st-from: "./theme.st.css";
                        }
                        .b { color:green; } 
                    `
                },
                "/comp.st.css": {
                    namespace: 'comp',
                    content: `
                        :import {                            
                            -st-from: "./comp.st.css";
                        }
                        .b { color:green; } 
                    `
                },
                "/comp2.st.css": {
                    namespace: 'comp2',
                    content: `
                        :import {
                            -st-from: "./theme.st.css";
                        }
                        .b { color:green; } 
                    `
                },
                "/theme.st.css": {
                    namespace: 'theme',
                    content: `
                        .a { color:red; }
                    `
                }
            }
        });

        expect(cssOutput).to.eql([
            '.theme--root .theme--a { color:red; }',
            '.comp2--root .comp2--b { color:green; }',
            '.comp--root .comp--b { color:green; }',
            '.entry--root .entry--b { color:green; }'
        ].join('\n'));
    });

    // // used = [
    // //     {id: '/a.css', used: true},
    // //     {id: '/b.css', used: true},
    // //     {id: '/theme.css', used: true, theme: true}
    // // ]

    // list = [
    //     {id: '/a.js', imports: ['/a.css' ,'/b.js'], type: 'js'},
    //     {id: '/a.css', imports: ['/theme.css'], type: 'css'},
    //     {id: '/b.js', imports: ['/b.css'], type: 'js'},
    //     {id: '/b.css', imports: ['/theme.css'], type: 'css'},
    //     {id: '/theme.css', imports: ['/b.css'], type: 'css'}
    // ]


    //bundle.css (bottom is strong)
    // '/button.st.css'
    // '/form.st.css'

    // it('should output theme from sheet marked for output and it\'s dependencies', () => {
    //     const cssOutput = generateStylableOutput({
    //         entry: '/entry.st.css',
    //         usedFiles: [
    //             '/form.st.css',
    //             '/button.st.css'
    //         ],
    //         files: {
    //             "/backoffice-theme.st.css": {
    //                 namespace: 'backoffice',
    //                 content: `
    //                     :import {
    //                         -st-from: "./button.st.css";
    //                         -st-default: Button;
    //                     }
    //                     :vars {
    //                         color1: gold;
    //                         color2: silver;
    //                     }
    //                     :import {
    //                         -st-theme: true;
    //                         -st-from: "./project.st.css";
    //                         -st-default: Project;
    //                         -st-named: cancelButton;
    //                     }
    //                     Button {
    //                           outline:value(color1);
    //                     }
    //                     .cancelButton { 
    //                            background:value(color2);
    //                     }
    //                 `
    //             },
    //             "/project.st.css": {
    //                 namespace: 'project',
    //                 content: `
    //                     :import {
    //                         -st-from: "./button.st.css";
    //                         -st-default: Button;
    //                     }
    //                     .cancelButton {
    //                         -st-variant: true;
    //                         -st-extends: Button;
    //                         color: red;
    //                     }

    //                 `
    //             },
    //             "/button.st.css": {
    //                 namespace: 'button',
    //                 content: `
    //                     .root {
    //                         display: inline-block;
    //                     }
    //                     .content {} 
    //                 `
    //             },
    //             "/form.st.css": {
    //                 namespace: 'button',
    //                 content: `
    //                     :import {
    //                          -st-from: "./button.st.css";
    //                         -st-default: Button;
    //                     }
    //                     :import {
    //                         -st-from: "./project.st.css";
    //                         -st-named: cancelButton;
    //                     }
    //                     .ok {
    //                           -st-extends: Button;
    //                     }
    //                     .cancel { 
    //                          -st-extends: cancelButton;
    //                     }
    //                 `
    //             },
    //             "app.js": {
    //                 content: `
    //                     import Form form "./form.ts";

    //                 `
    //             }
    //         }
    //     });

    //     expect(cssOutput).to.eql([
    //         '.theme--root .theme--a { color:red; }',
    //         '.entry--root .entry--b { color:green; }'
    //     ].join('\n'));
    // });




    it('should output theme override from sheet marked for output', () => {
        const cssOutput = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        
                        :import {
                            -st-theme: true;
                            -st-from: "./theme.st.css";
                            color1: gold;
                        }
                        .b { color:green; } 
                    `
                },
                "/theme.st.css": {
                    namespace: 'theme',
                    content: `
                        :vars {
                            color1:red;
                        }
                        .a { color:value(color1); }
                    `
                }
            }
        });

        expect(cssOutput).to.eql([
            '.theme--root .theme--a { color:red; }',
            '.entry--root .theme--a { color:gold; }',
            '.entry--root .entry--b { color:green; }'
        ].join('\n'));

        // <div class="entry--root theme--root">
        //     <div class="theme-a"></div>
        // </div>
    });

    it('should output only effected theme override', () => {
        const cssOutput = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-theme: true;
                            -st-from: "./theme.st.css";
                            color1: gold;
                        }
                        .b { color:green; } 
                    `
                },
                "/theme.st.css": {
                    namespace: 'theme',
                    content: `
                        :vars {
                            color1:red;
                        }
                        .a { color:value(color1); background:yellow; }
                        .c { color:purple; }
                    `
                }
            }
        });

        expect(cssOutput).to.eql([
            `.theme--root .theme--a { color:red; background:yellow; }`,
            `.theme--root .theme--c { color:purple; }`,
            `.entry--root .theme--a { color:gold; }`,
            `.entry--root .entry--b { color:green; }`
        ].join('\n'));
    });

    it('should output theme override after theme output', () => {
        const cssOutput = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css',
                '/comp.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-theme: true;
                            -st-from: "./theme.st.css";
                            color1: gold;
                        }
                        .b { color:green; } 
                    `
                },
                "/comp.st.css": {
                    namespace: 'comp',
                    content: `
                        :import {
                            -st-from: "./theme.st.css";
                        }
                        .x { color:blue; } 
                    `
                },
                "/theme.st.css": {
                    namespace: 'theme',
                    content: `
                        :vars {
                            color1:red;
                        }
                        .a { color:value(color1); }
                    `
                }
            }
        });

        expect(cssOutput).to.eql([
            '.theme--root .theme--a { color:red; }',
            '.entry--root .theme--a { color:gold; }',

            '.comp--root .comp--x { color:blue; }',

            '.entry--root .entry--b { color:green; }'
        ].join('\n'));
    });

    it.skip('should output theme override from multiple levels from sheet marked for output', () => {
        const cssOutput = generateStylableOutput({
            entry: '/entry.st.css',
            usedFiles: [
                '/entry.st.css'
            ],
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-theme: true;
                            -st-from: "./theme.st.css";
                            color1: gold;
                        }
                        .c { color:green; } 
                    `
                },
                "/theme.st.css": {
                    namespace: 'theme',
                    content: `
                        :import {
                            -st-theme: true;
                            -st-from: "./base-theme.st.css";
                            -st-named: color1;
                        }
                        .b { color:value(color1); }
                    `
                },
                "/base-theme.st.css": {
                    namespace: 'base-theme',
                    content: `
                        :vars {
                            color1:red;
                        }
                        .a { color:value(color1); }
                    `
                }
            }
        });

        expect(cssOutput).to.eql([
            '.base-theme--root .base-theme--a { color:red; }',
            '.entry--root .base-theme--a { color:gold; }',

            '.theme--root .theme--b { color:red; }',
            '.entry--root .theme--b { color:gold; }',

            '.entry--root .entry--c { color:green; }'
        ].join('\n'));

        // <div class="entry--root theme--root">
        //     <div class="theme-a"></div>
        // </div>
    });

})