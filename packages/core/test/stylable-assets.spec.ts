import { expect } from 'chai';
import { normalize } from 'path';
import { createMemoryFs } from '@file-services/memory';
import {
    collectAssets,
    isAsset,
    makeAbsolute,
    safeParse,
    fixRelativeUrls,
    createDefaultResolver,
    fixRelativeUrlsWithNodeModules,
} from '../src';
const css = `
    .a{
        background: url("./a.png")
    }
    .b{
        background: url("/b.png")
    }
    .b{
        background: url("~some-package/c.png")
    }
    .c{
        background: url("data:xxx")
    }
    .d{
        background: url("http://d.ddd")
    }
`;

describe('stylable assets', () => {
    it('collect url assets', () => {
        const ast = safeParse(css);
        expect(collectAssets(ast)).to.eql([
            './a.png',
            '/b.png',
            '~some-package/c.png',
            'data:xxx',
            'http://d.ddd',
        ]);
    });

    it('filter local assets', () => {
        const ast = safeParse(css);
        expect(collectAssets(ast).filter(isAsset)).to.eql([
            './a.png',
            '/b.png',
            '~some-package/c.png',
        ]);
    });

    it('makeAbsolute', () => {
        const ast = safeParse(css);
        expect(collectAssets(ast).map((_) => makeAbsolute(_, '/root', '/root/module'))).to.eql([
            normalize('/root/module/a.png'),
            normalize('/root/b.png'),
            normalize('~some-package/c.png'),
            'data:xxx',
            'http://d.ddd',
        ]);
    });

    it('isAsset', () => {
        expect(isAsset('./a.png'), 'relative').to.equal(true);
        expect(isAsset('/a.png'), 'absolute').to.equal(true);
        expect(isAsset('~some-package/c.png'), '3rd party').to.equal(true);
        expect(isAsset('data:'), 'data').to.equal(false);
        expect(isAsset('http://s.sss'), 'url').to.equal(false);
    });

    it('fixRelativeUrls', () => {
        const ast = safeParse(css);

        fixRelativeUrls(ast, '/root', '/root/module', (path: string, _context: string) => {
            return path;
        });
        const [relative, absolute, external, data, url] = collectAssets(ast);

        expect(relative).to.equal('../a.png');
        expect(absolute).to.equal('/b.png');
        expect(external).to.equal('~some-package/c.png');
        expect(data).to.equal('data:xxx');
        expect(url).to.equal('http://d.ddd');
    });

    it('fixRelativeUrlsWithNodeModules', () => {
        const ast = safeParse(`
        .b{
            background: url("~base/asset.png")
        }
        `);
        const fs = createMemoryFs({
            '/': {
                node_modules: {
                    base: {
                        'asset.png': '',
                    },
                    mixin: {
                        'mix.st.css': '',
                    },
                },
                src: {
                    'index.st.css': '',
                },
            },
        });

        const resolver = createDefaultResolver(fs, {});

        fixRelativeUrlsWithNodeModules(
            ast,
            '/node_modules/mixin/mix.st.css',
            '/src/index.st.css',
            (path: string, context: string) => resolver(context, path)
        );
        const [thirdParty] = collectAssets(ast);

        expect(thirdParty).to.equal('../node_modules/base/asset.png');
    });
});
