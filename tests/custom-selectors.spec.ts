import * as postcss from 'postcss';
import { cachedProcessFile } from '../src/cached-process-file';
import { process, StylableMeta } from '../src/stylable-processor';
import { expect } from "chai";
import { generateStylableRoot } from './utils/generate-test-util';



export var loadFile: any = cachedProcessFile<StylableMeta>((path, content) => {
    return processSource(content, { from: path })
},
    {
        readFileSync() {
            return '';
        },
        statSync() {
            return { mtime: new Date };
        }
    }
)


function processSource(source: string, options: postcss.ProcessOptions = {}) {
    return process(postcss.parse(source, options));
}

describe('@custom-selector', function () {


    it('collect custom-selectors', function () {
        const from = "/path/to/style.css";
        const result = processSource(`
            @custom-selector :--icon .root > .icon;
        `, { from });


        expect(result.customSelectors[":--icon"]).to.equal('.root > .icon');

    });


    it('expand custom-selector before process (reflect on ast)', function () {
        const from = "/path/to/style.css";
        const result = processSource(`
            @custom-selector :--icon .root > .icon;
            :--icon, .class {
                color: red;
            }
        `, { from });

        const r = <postcss.Rule>result.ast.nodes![0];
        expect(r.selector).to.equal('.root > .icon, .class');
        expect(result.classes['icon']).to.contain({ "_kind": "class", "name": "icon" })

    });

    it('expand custom-selector before process (reflect on ast when not written)', function () {
        const from = "/path/to/style.css";
        const result = processSource(`
            @custom-selector :--icon .root > .icon;
        `, { from });
        
        expect(result.classes['icon']).to.contain({ "_kind": "class", "name": "icon" })

    });


    it('expand custom-selector in pseudo-element in the owner context', function () {
        
        const ast = generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./comp.st.css";
                            -st-default: Comp;
                        }

                        Comp::root-icon{
                            color: blue;
                        }
                    `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        @custom-selector :--root-icon .root > .icon;

                        :--root-icon, .class {
                            color: red;
                        }

                        .icon {
                            
                        }
                    `
                }
            }
        });

        const r = <postcss.Rule>ast.nodes![0];
        expect(r.selector).to.equal('.entry--root .comp--root > .comp--icon');
        

    });



    it('expand custom-selector in pseudo-element in the owner context', function () {
        
        const ast = generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./comp.st.css";
                            -st-default: Comp;
                        }

                        Comp::root-icon::top{
                            color: blue;
                        }
                    `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        @custom-selector :--root-icon .root > .icon;
                        :import {
                            -st-from: "./child.st.css";
                            -st-default: Child; 
                        }
                        :--root-icon, .class {
                            color: red;
                        }

                        .icon {
                            -st-extends: Child;
                        }
                    `
                },
                '/child.st.css': {
                    namespace: 'child',
                    content: `
                        .top {
                            
                        }
                    `
                }
            }
        });

        const r = <postcss.Rule>ast.nodes![0];
        expect(r.selector).to.equal('.entry--root .comp--root > .comp--icon.child--root .child--top');
        

    });


    

    it('expand custom-selector in pseudo-element in the owner context', function () {
        
        const ast = generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./comp.st.css";
                            -st-default: Comp;
                        }

                        Comp::class-icon{
                            color: blue;
                        }
                    `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        @custom-selector :--class-icon .icon, .class;
                    `
                }
            }
        });

        const r = <postcss.Rule>ast.nodes![0];
        expect(r.selector).to.equal('.entry--root .comp--root .comp--icon,.entry--root .comp--root .comp--class');
        

    });

});

