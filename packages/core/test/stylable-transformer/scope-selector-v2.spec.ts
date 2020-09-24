import { generateStylableRoot } from '@stylable/core-test-kit';
import * as postcss from 'postcss';

function selfTest(
    result: postcss.Root,
    expectedTestsCount = result.toString().match(/@check/gm)!.length
) {
    if (expectedTestsCount === 0) {
        throw new Error('no tests found try to add @check comments before any selector');
    }
    const checks: Array<[string, string]> = [];

    result.walkRules((rule) => {
        const p = rule.prev();
        if (p && p.type === 'comment') {
            const m = p.text.match(/@check\s+(.*)/);
            if (m) {
                checks.push([rule.selector, m[1]]);
            }
        }
    });
    const errors: string[] = [];
    checks.forEach(([a, b]) => {
        if (a !== b) {
            errors.push(`expected ${a} to transform to ${b}`);
        }
    });
    if (errors.length) {
        throw new Error(errors.join('\n'));
    }
    if (expectedTestsCount !== checks.length) {
        throw new Error(
            `Expected ${expectedTestsCount} checks to run but there was ${checks.length}`
        );
    }
}

describe('Stylable scope-selector v2', () => {
    it('should handle basic transform', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                        :import {
                            -st-from: "./base.st.css";
                            -st-named: base;
                            -st-default: Base;
                        }

                        /*
                            @check .style__t1 .base__base
                        */
                        .t1::base {}

                        
                        /*
                            @check .style__t1.base--test
                        */
                        .t1:test {}

                        
                        /*
                            @check .style__t1
                        */
                        .t1 {
                            -st-extends: Base;
                        }


                        /*
                            @check .style__states.style--myState
                        */
                        .states:myState {

                        }

                        .states {
                            -st-states: myState;
                        }
                        
                        /*
                            @check .style__x:hover
                        */
                        .x:hover{}

                        /*
                            @check .style__x:not(.style__y)
                        */
                        .x:not(.y){}

                        /*
                            @check .style__x:not(.style__y, .style__x)
                        */
                        .x:not(.y, .x){}
                        
                        /* 
                            @check .x
                        */                        
                        :global(.x){}


                        /* 
                            @check .base__base
                        */
                        .base {}

                        /* 
                            @check .base__root
                        */
                        Base {}

                        /* 
                            @check div
                        */
                        div {}
                        
                        /* 
                            @check Div 
                        */
                        Div {}
                                                
                        .root {
                        }

                        /* 
                            ALIAS CHECK
                            @check .style__root .base__base
                        */
                        .root::base{}

                        .root .x::y::z{}

                        /* 
                            @check .style__root .style__x
                        */
                        .root::x {}

                        /* 
                            @check .style__root .style__y
                        */
                        .root::y {}

                        .y{
                            -st-extends: root;
                        }
                    `,
                },
                '/base.st.css': {
                    namespace: 'base',
                    content: `
                        .root {
                            -st-states: test;
                        }
                        .x{}
                        .base {}
                    `,
                },
            },
        });

        selfTest(result);
    });

    it('should properly scope states in nested-pseudo-classes', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                        :import {
                            -st-from: "./base.st.css";
                            -st-named: base, otherBase;
                            -st-default: Base;
                        }

                        /*
                            @check .style__root .base__base:not(.base--testInner)
                        */
                        .root::base:not(:testInner) {}

                        /*
                            @check .style__root .base__base:not(.base--testInner.style__local)
                        */
                        .root::base:not(:testInner.local) {}

                        /*
                            @check .style__root .base__base:not(.base--testInner.base__otherBase)
                        */
                        .root::base:not(:testInner.otherBase) {}

                        /*
                            @check .style__root .base__base:not(.base__base.base--testInner)
                        */
                        .root::base:not(.base:testInner) {}

                        .root {
                            -st-extends: Base;
                        }

                        .local {}
                     
                    `,
                },
                '/base.st.css': {
                    namespace: 'base',
                    content: `
                        .root {
                            -st-states: test;
                        }
                        .base{
                            -st-states: testInner;
                        }
                        .otherBase {}
                    `,
                },
            },
        });

        selfTest(result);
    });

    it('should properly scope states in nested-pseudo-classes (more exmaples)', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                        :import {
                            -st-from: "./middle.st.css";
                            -st-named: Base;
                            -st-default: Mid;
                        }
                        /*
                            @check .style__local .base__otherBase
                        */
                        .local::otherBase {}
                        /*
                            @check .style__local .mid__mid .base__base
                        */
                        .local::mid::base {}

                        /*
                            @check .style__root .base__base
                        */
                        .root::base {}
                        /*
                            @check .style__local .mid__mid
                        */
                        .local::mid {}

                        /*
                            @check .style__local .mid__base
                        */
                        .local::base {}

                        .root {
                            -st-extends: Base;
                        }

                        .local {
                            -st-extends: Mid;
                        }
                     
                    `,
                },
                '/middle.st.css': {
                    namespace: 'mid',
                    content: `
                        :import {
                            -st-from: "./base.st.css";
                            -st-default: Base;
                            -st-named: otherBase;
                        }
                        .root {
                            -st-extends: Base;
                        }
                        .mid {
                            -st-extends: Base;
                        }

                        .otherBase{}

                        .base {}

                        Base{}
                    `,
                },
                '/base.st.css': {
                    namespace: 'base',
                    content: `
                        .root {
                            -st-states: test;
                        }
                        .base{
                            -st-states: testInner;
                        }
                        .otherBase {}
                    `,
                },
            },
        });

        selfTest(result);
    });

    it('should properly scope states in nested-pseudo-classes with aliase state override', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                        :import {
                            -st-from: "./middle.st.css";
                            -st-default: Mid;
                        }
                        /*
                            @check .style__local .base__base
                        */
                        .local::base {}

                        
                        /*
                            @check .style__local .base__base.mid--teststate
                        */
                        .local::base:teststate {}


                        .local {
                            -st-extends: Mid;
                        }
                     
                    `,
                },
                '/middle.st.css': {
                    namespace: 'mid',
                    content: `
                        :import {
                            -st-from: "./base.st.css";
                            -st-default: Base;
                            -st-named: base;
                        }
                        .root {
                            -st-extends: Base;
                        }
                        
                        .base {
                            -st-states: teststate;
                        }

                    `,
                },
                '/base.st.css': {
                    namespace: 'base',
                    content: `
                        .root {
                            -st-states: test;
                        }
                        .base{
                            -st-states: testInner;
                        }
                    `,
                },
            },
        });

        selfTest(result);
    });

    it('should properly scope states in nested-pseudo-classes222231241241242', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                        .root {
                            
                        }

                        .local {
                            -st-extends: root;
                        }

                        .y {}

     
                        /*
                            @check .style__local .style__y
                        */
                        .local::y {

                        }
                     
                    `,
                },
            },
        });

        selfTest(result);
    });
});
