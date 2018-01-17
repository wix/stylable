import { expect } from 'chai';
import { resolve } from 'path';
import { createMinimalFS, process, safeParse, StylableResolver } from '../src';
import { cachedProcessFile, MinimalFS } from '../src/cached-process-file';
import { StylableMeta } from '../src/stylable-processor';
import { generateInfra } from './utils/generate-test-util';

function createResolveExtendsResults(
    fs: MinimalFS,
    fileToProcess: string,
    classNameToLookup: string,
    isElement: boolean = false
) {
    const processFile = cachedProcessFile<StylableMeta>((fullpath, content) => {
        return process(safeParse(content, { from: fullpath }));
    }, fs);

    const resolver = new StylableResolver(processFile, (module: string) => (module && ''));
    return resolver.resolveExtends(processFile.process(fileToProcess), classNameToLookup, isElement);
}

describe('stylable-resolver', () => {
    it('should resolve extend classes', () => {
        const { fs } = createMinimalFS({
            files: {
                '/button.st.css': {
                    content: `
                        @namespace:'Button';
                        .root {
                            color:red;
                        }
                    `
                },
                '/extended-button.st.css': {
                    content: `
                        :import {
                            -st-from: './button.st.css';
                            -st-default: Button;
                        }
                        .myClass {
                            -st-extends:Button;
                            width: 100px;
                        }
                    `
                }
            }
        });

        const results = createResolveExtendsResults(fs, '/extended-button.st.css', 'myClass');
        expect(results[0].symbol.name).to.equal('myClass');
        expect(results[1].symbol.name).to.equal('root');
        expect(results[1].meta.source).to.equal(resolve('/button.st.css'));

    });

    it('should resolve extend elements', () => {
        const { fs } = createMinimalFS({
            files: {
                '/button.st.css': {
                    content: `
                        @namespace:'Button';
                        .root {
                            color:red;
                        }
                    `
                },
                '/extended-button.st.css': {
                    content: `
                        :import {
                            -st-from: './button.st.css';
                            -st-default: Button;
                        }
                        Button {
                            width: 100px;
                        }
                    `
                }
            }
        });

        const results = createResolveExtendsResults(fs, '/extended-button.st.css', 'Button', true);
        expect(results[0].symbol.name).to.equal('Button');
        expect(results[1].symbol.name).to.equal('root');
        expect(results[1].meta.source).to.equal(resolve('/button.st.css'));

    });

    it('should resolve extend classes on broken css', () => {
        const { fs } = createMinimalFS({
            files: {
                '/button.st.css': {
                    content: `
                        .gaga
                    `
                }
            }
        });
        const results = createResolveExtendsResults(fs, resolve('/button.st.css'), 'gaga');
        expect(results).to.eql([]);
    });

    it('should resolve classes', () => {

        const { resolver, fileProcessor } = generateInfra({
            files: {
                '/entry.st.css': {
                    content: `
                        :import {
                            -st-from: "./button.st.css";
                            -st-default: Button;
                        }
                        .x {-st-extends: Button}
                    `
                },
                '/button.st.css': {
                    content: `
                        .root{}
                    `
                }
            }
        });

        const entryMeta = fileProcessor.process('/entry.st.css');
        const btnMeta = fileProcessor.process('/button.st.css');
        const res = resolver.resolve(entryMeta.mappedSymbols.x);

        expect(res!.symbol).to.eql(btnMeta.classes.root);
    });

    it('should resolve elements', () => {

        const { resolver, fileProcessor } = generateInfra({
            files: {
                '/entry.st.css': {
                    content: `
                        :import {
                            -st-from: "./button.st.css";
                            -st-default: Button;
                            -st-named: ButtonX;
                        }
                        Button {}
                        ButtonX {}
                    `
                },
                '/button.st.css': {
                    content: `
                        .root{}
                        .label{}
                        ButtonX{}
                    `
                }
            }
        });

        const btnMeta = fileProcessor.process('/button.st.css');
        const entryMeta = fileProcessor.process('/entry.st.css');
        const btn = entryMeta.mappedSymbols.Button;
        const res = resolver.resolve(btn);

        const btn1 = entryMeta.mappedSymbols.ButtonX;
        const res1 = resolver.resolve(btn1);

        expect(res!.symbol).to.eql(btnMeta.classes.root);
        expect(res1!.symbol).to.eql(btnMeta.elements.ButtonX);
    });

    it('should resolve elements deep', () => {

        const { resolver, fileProcessor } = generateInfra({
            files: {
                '/entry.st.css': {
                    content: `
                        :import {
                            -st-from: "./button.st.css";
                            -st-named: ButtonX;
                        }
                        ButtonX {}
                    `
                },
                '/button.st.css': {
                    content: `
                        :import {
                            -st-from: "./button-x.st.css";
                            -st-default: ButtonX;
                        }
                        ButtonX{}
                    `
                },
                '/button-x.st.css': {
                    content: `
                        .x-label{}
                    `
                }
            }
        });

        const entryMeta = fileProcessor.process('/entry.st.css');
        const btnXMeta = fileProcessor.process('/button-x.st.css');

        const btn1 = entryMeta.mappedSymbols.ButtonX;
        const res1 = resolver.deepResolve(btn1);

        expect(res1!.symbol).to.eql(btnXMeta.classes.root);
    });

});
