import { expect } from 'chai';
import type * as postcss from 'postcss';
import { testStylableCore, generateStylableResult } from '@stylable/core-test-kit';
import type { MinimalFS, StylableMeta } from '@stylable/core';
import {
    cssParse,
    process,
    StylableResolver,
    createDefaultResolver,
    cachedProcessFile,
} from '@stylable/core/dist/index-internal';

function createResolveExtendsResults(
    fs: MinimalFS,
    fileToProcess: string,
    classNameToLookup: string,
    isElement = false
) {
    const moduleResolver = createDefaultResolver(fs, {});

    const processFile = cachedProcessFile<StylableMeta>((fullpath, content) => {
        return process(cssParse(content, { from: fullpath }));
    }, fs);

    const resolver = new StylableResolver(
        processFile,
        (module: string) => module && '',
        (context = '/', request: string) => moduleResolver(context, request)
    );

    return resolver.resolveExtends(
        processFile.process(fileToProcess),
        classNameToLookup,
        isElement
    );
}

describe('stylable-resolver', () => {
    it('should resolve extend classes', () => {
        const { fs } = testStylableCore({
            '/button.st.css': `
                @namespace:'Button';
                .root {
                    color:red;
                }
            `,
            '/extended-button.st.css': `
                :import {
                    -st-from: './button.st.css';
                    -st-default: Button;
                }
                .myClass {
                    -st-extends:Button;
                    width: 100px;
                }
            `,
        });

        const results = createResolveExtendsResults(fs, '/extended-button.st.css', 'myClass');
        expect(results[0].symbol.name).to.equal('myClass');
        expect(results[1].symbol.name).to.equal('root');
        expect(results[1].meta.source).to.equal('/button.st.css');
    });

    it('should resolve extend elements', () => {
        const { fs } = testStylableCore({
            '/button.st.css': `
                @namespace:'Button';
                .root {
                    color:red;
                }
            `,
            '/extended-button.st.css': `
                :import {
                    -st-from: './button.st.css';
                    -st-default: Button;
                }
                Button {
                    width: 100px;
                }
            `,
        });

        const results = createResolveExtendsResults(fs, '/extended-button.st.css', 'Button', true);
        expect(results[0].symbol.name).to.equal('Button');
        expect(results[1].symbol.name).to.equal('root');
        expect(results[1].meta.source).to.equal('/button.st.css');
    });

    it('should not enter infinite loops even with broken code', () => {
        const { fs } = testStylableCore({
            '/button.st.css': `
                @namespace: 'Button';
                :import {
                    -st-from: './extended-button.st.css';
                    -st-default: Button;
                }
                .root {
                    -st-extends: Button
                }
            `,
            '/extended-button.st.css': `
                :import {
                    -st-from: './button.st.css';
                    -st-default: Button;
                }
                .root {
                    -st-extends: Button;
                }
                Button {
                    width: 100px;
                }
            `,
        });

        const results = createResolveExtendsResults(fs, '/extended-button.st.css', 'Button', true);
        expect(results[0].symbol.name).to.equal('Button');
        expect(results[1].symbol.name).to.equal('root');
        expect(results[1].meta.source).to.equal('/button.st.css');
    });

    it.skip('should resolve extend classes on broken css', () => {
        const { fs } = testStylableCore({
            '/button.st.css': `
                .gaga
            `,
        });
        const results = createResolveExtendsResults(fs, '/button.st.css', 'gaga');
        expect(results).to.eql([]);
    });

    it('should resolve extend through exported alias', () => {
        const { fs } = testStylableCore({
            '/entry.st.css': `
                :import {
                    -st-from: "./index.st.css";
                    -st-named: Comp;
                }
                .root {
                    -st-extends: Comp;
                }
            `,
            '/index.st.css': `
                :import{
                    -st-from: "./button.st.css";
                    -st-default: Comp;
                }
                Comp{}
            `,
            '/button.st.css': `
                .root{}
            `,
        });

        const results = createResolveExtendsResults(fs, '/entry.st.css', 'root');

        expect(results[0].symbol.name).to.equal('root');
        expect(results[1].symbol.name).to.equal('Comp');
        expect(results[2].symbol.name).to.equal('root');

        expect(results[0].meta.source).to.equal('/entry.st.css');
        expect(results[1].meta.source).to.equal('/index.st.css');
        expect(results[2].meta.source).to.equal('/button.st.css');
    });

    it('should resolve class as local and not an alias when an -st-extend is present', () => {
        const { fs } = testStylableCore({
            '/entry.st.css': `
                :import {
                    -st-from: 'inner.st.css';
                    -st-named: alias;
                }
                .root {}

                .alias {
                    -st-extends: root;
                }
                
                .target { 
                    -st-extends: alias;
                }
            `,
            '/inner.st.css': `
                .alias {}
            `,
        });

        const results = createResolveExtendsResults(fs, '/entry.st.css', 'target');

        expect(results[0].symbol.name).to.equal('target');
        expect(results[1].symbol.name).to.equal('alias');
        expect(results[2].symbol.name).to.equal('root');

        expect(results[0].meta.source).to.equal('/entry.st.css');
        expect(results[1].meta.source).to.equal('/entry.st.css');
        expect(results[2].meta.source).to.equal('/entry.st.css');
    });

    it('should resolve classes', () => {
        const { stylable } = testStylableCore({
            'entry.st.css': `
                :import {
                    -st-from: "./button.st.css";
                    -st-default: Button;
                }
                .x {-st-extends: Button}
            `,
            'button.st.css': `
                .root{}
            `,
        });

        const entryMeta = stylable.fileProcessor.process('/entry.st.css');
        const btnMeta = stylable.fileProcessor.process('/button.st.css');
        const res = stylable.resolver.resolve(entryMeta.getSymbol(`x`));

        expect(res?.symbol).to.eql(btnMeta.getClass(`root`));
    });

    it('should resolve elements', () => {
        const { stylable } = testStylableCore({
            'entry.st.css': `
                :import {
                    -st-from: "./button.st.css";
                    -st-default: Button;
                    -st-named: ButtonX;
                }
                Button {}
                ButtonX {}
            `,
            'button.st.css': `
                .root{}
                .label{}
                ButtonX{}
            `,
        });

        const btnMeta = stylable.fileProcessor.process('/button.st.css');
        const entryMeta = stylable.fileProcessor.process('/entry.st.css');
        const btn = entryMeta.getSymbol(`Button`);
        const res = stylable.resolver.resolve(btn);

        const btn1 = entryMeta.getSymbol(`ButtonX`);
        const res1 = stylable.resolver.resolve(btn1);

        expect(res?.symbol).to.eql(btnMeta.getClass(`root`));
        expect(res1?.symbol).to.eql(btnMeta.getTypeElement(`ButtonX`));
    });

    it('should resolve elements deep', () => {
        const { stylable } = testStylableCore({
            'entry.st.css': `
                :import {
                    -st-from: "./button.st.css";
                    -st-named: ButtonX;
                }
                ButtonX {}
            `,
            'button.st.css': `
                :import {
                    -st-from: "./button-x.st.css";
                    -st-default: ButtonX;
                }
                ButtonX{}
            `,
            'button-x.st.css': `
                .x-label{}
            `,
        });

        const entryMeta = stylable.fileProcessor.process('/entry.st.css');
        const btnXMeta = stylable.fileProcessor.process('/button-x.st.css');

        const btn1 = entryMeta.getSymbol(`ButtonX`);
        const res1 = stylable.resolver.deepResolve(btn1);

        expect(res1?.symbol).to.eql(btnXMeta.getClass(`root`));
    });

    it('should handle circular "re-declare" (deepResolve)', () => {
        const { stylable } = testStylableCore({
            'entry.st.css': `
                :import {
                    -st-from: "./entry.st.css";
                    -st-named: a;
                }
                .a {}
            `,
        });

        const entryMeta = stylable.fileProcessor.process('/entry.st.css');

        const a = entryMeta.getSymbol(`a`);
        const res1 = stylable.resolver.deepResolve(a);

        expect(res1?.symbol).to.eql(entryMeta.getClass(`a`));
    });

    it('should handle circular "re-declare" (resolveSymbolOrigin)', () => {
        const { stylable } = testStylableCore({
            'entry.st.css': `
                :import {
                    -st-from: "./entry.st.css";
                    -st-named: a;
                }
                .a {}
            `,
        });

        const entryMeta = stylable.fileProcessor.process('/entry.st.css');

        const a = entryMeta.getSymbol(`a`);
        const res1 = stylable.resolver.resolveSymbolOrigin(a, entryMeta);

        expect(res1?.symbol).to.eql(entryMeta.getClass(`a`));
    });

    it('should resolve alias origin', () => {
        const { stylable } = testStylableCore({
            '/entry.st.css': `
                :import {
                    -st-from: "./a.st.css";
                    -st-named: a, b;
                }
                .a{}
                .b{}
            `,
            '/a.st.css': `
                :import {
                    -st-from: "./a1.st.css";
                    -st-named: a, b;
                }
                .a{}
                .b{}
                `,
            '/a1.st.css': `
                :import {
                    -st-from: "./comp.st.css";
                    -st-named: Comp;
                }
                .a{}
                .b{-st-extends: Comp}
                `,
            '/comp.st.css': ``,
        });

        const entryMeta = stylable.fileProcessor.process('/entry.st.css');
        const a1 = stylable.fileProcessor.process('/a1.st.css');

        const res1 = stylable.resolver.resolveSymbolOrigin(entryMeta.getSymbol(`a`), entryMeta);
        const res2 = stylable.resolver.resolveSymbolOrigin(entryMeta.getSymbol(`b`), entryMeta);

        expect(res1?.symbol).to.eql(a1.getClass(`a`));
        expect(res2?.symbol).to.eql(a1.getClass(`b`));
    });

    it('should not resolve extends on alias', () => {
        const { stylable } = testStylableCore({
            'entry.st.css': `
                :import {
                    -st-from: "./a.st.css";
                    -st-named: a;
                }
                .a {
                -st-extends: a;
                }
            `,
            '/a.st.css': `
                .a{}
            `,
        });

        const entryMeta = stylable.fileProcessor.process('/entry.st.css');
        const res1 = stylable.resolver.resolveSymbolOrigin(entryMeta.getSymbol(`a`), entryMeta);
        expect(res1?.symbol).to.eql(entryMeta.getClass(`a`));
    });

    it('should resolve 4th party according to context', () => {
        const { meta } = generateStylableResult({
            entry: '/node_modules/a/index.st.css',
            files: {
                '/node_modules/a/index.st.css': {
                    namespace: 'A',
                    content: `
                        :import {
                            -st-from: "b/index.st.css";
                            -st-default: B;
                        }
                        .root {
                            -st-extends: B;
                        }
                    `,
                },
                '/node_modules/a/node_modules/b/index.st.css': {
                    namespace: 'B',
                    content: ``,
                },
            },
        });

        const rule = meta.outputAst!.nodes[0] as postcss.Rule;
        expect(rule.selector).to.equal('.A__root');
        expect(meta.diagnostics.reports).to.eql([]);
        expect(meta.transformDiagnostics!.reports).to.eql([]);
    });
});
