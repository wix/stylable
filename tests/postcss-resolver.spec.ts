import {expect} from 'chai';
import {resolve} from 'path';
import {createMinimalFS, process, safeParse, StylableResolver} from '../src';
import {cachedProcessFile, MinimalFS} from '../src/cached-process-file';
import {StylableMeta} from '../src/stylable-processor';

function createResolveExtendsResults(
    fs: MinimalFS,
    fileToProcess: string,
    classNameToLookup: string,
    isElement: boolean = false
) {
    const processFile = cachedProcessFile<StylableMeta>((fullpath, content) => {
        return process(safeParse(content, {from: fullpath}));
    }, fs);

    const resolver = new StylableResolver(processFile, (module: string) => (module && ''));
    return resolver.resolveExtends(processFile.process(fileToProcess), classNameToLookup, isElement);
}

describe('stylable-resolver', () => {
    it('should resolve extend classes', () => {
        const {fs} = createMinimalFS({
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
        const {fs} = createMinimalFS({
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
        const {fs} = createMinimalFS({
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
});
