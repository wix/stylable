import { expect } from 'chai';
import type * as postcss from 'postcss';
import { generateStylableRoot } from '@stylable/core-test-kit';

describe('Stylable postcss transform (General)', () => {
    it('should output empty on empty input', () => {
        const result = generateStylableRoot({
            entry: `/style.st.css`,
            files: {
                '/style.st.css': {
                    content: '',
                },
            },
        });

        expect(result.toString()).to.equal('');
    });

    it('should hoist :imports', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    content: `
                        
                        :import {
                            -st-from:"./index.st.css";
                            -st-named: Comp;
                        }
                        
                        Comp{}

                    `,
                },
                '/index.st.css': {
                    namespace: 'index',
                    content: `
                        
                        :import {
                            -st-from:"./comp.st.css";
                            -st-default: Comp;
                        }
                        
                        Comp{}
                        
                        :import {
                            -st-from:"./comp.st.css";
                            -st-default: Comp;
                        }
                        
                        Comp{}
                    `,
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        .root{}                        
                    `,
                },
            },
        });

        expect(result.nodes[0].toString()).to.equal('.comp__root{}');
    });

    it('should hoist :imports and support different import symbols', () => {
        const result = generateStylableRoot({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    content: `
                        
                        :import {
                            -st-from:"./index.st.css";
                            -st-named: Comp, part;
                        }
                        
                        Comp{}
                        .part{}

                    `,
                },
                '/index.st.css': {
                    namespace: 'index',
                    content: `
                        
                        :import {
                            -st-from:"./comp.st.css";
                            -st-default: Comp;
                        }
                        
                        Comp{}
                        
                        :import {
                            -st-from:"./comp.st.css";
                            -st-named: part;
                        }
                        
                        .part{}
                    `,
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        .root{}                        
                        .part{}                        
                    `,
                },
            },
        });

        expect(result.nodes[0].toString()).to.equal('.comp__root{}');
        expect(result.nodes[1].toString()).to.equal('.comp__part{}');
    });

    it('should not output :import', () => {
        const result = generateStylableRoot({
            entry: `/a/b/style.st.css`,
            files: {
                '/a/b/style.st.css': {
                    content: `
                        :import{
                            -st-from: "../test.st.css";
                            -st-default: name;
                        }
                    `,
                },
                '/a/test.st.css': {
                    content: '',
                },
            },
        });

        expect(result.nodes.length, 'remove all imports').to.equal(0);
    });

    it('should not output :vars', () => {
        const result = generateStylableRoot({
            entry: `/a/b/style.st.css`,
            files: {
                '/a/b/style.st.css': {
                    content: `
                        :vars {
                            myvar: red;
                        }
                    `,
                },
            },
        });

        expect(result.nodes.length, 'remove all vars').to.equal(0);
    });

    it('should support multiple selectors/properties with same name', () => {
        const result = generateStylableRoot({
            entry: `/a/b/style.st.css`,
            files: {
                '/a/b/style.st.css': {
                    content: `
                        .root {
                            color: red;
                            color: blue;
                        }
                        .root {
                            color: red;
                            color: blue;
                        }
                    `,
                },
            },
        });

        const rule = result.nodes[0] as postcss.Rule;
        expect(rule.nodes[0].toString(), 'color1').to.equal('color: red');
        expect(rule.nodes[1].toString(), 'color1').to.equal('color: blue');

        const rule2 = result.nodes[1] as postcss.Rule;
        expect(rule2.nodes[0].toString(), 'color1').to.equal('color: red');
        expect(rule2.nodes[1].toString(), 'color1').to.equal('color: blue');
    });
});
