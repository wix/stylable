import { expect } from 'chai';
import { Stylable, createDefaultResolver } from '@stylable/core';
import { build } from '@stylable/cli';
import { createMemoryFs } from '@file-services/memory';

describe('assets', function () {
    it('should copy imported relative native css', async () => {
        const fs = createMemoryFs({
            '/package.json': `{"name": "test", "version": "0.0.0"}`,
            '/src/entry.st.css': `
                @st-import './relative.css';
                @st-import './resolved-me';
                @st-import './other.st.css';
                @st-import 'styles/3rd-party.css';
            `,
            '/src/relative.css': '.native {}',
            '/src/custom-resolved.css': '.resolved {}',
            '/src/other.st.css': '.other {}',
            '/node_modules/styles/3rd-party.css': '.third-party {}',
        });
        const resolve = createDefaultResolver(fs, {});
        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
            resolveModule: (path, request) => {
                if (request === './resolved-me') {
                    return '/src/custom-resolved.css';
                }
                return resolve(path, request);
            },
        });

        await build(
            {
                srcDir: 'src',
                outDir: 'dist',
                cjs: false,
                outputCSS: true,
            },
            {
                fs,
                stylable,
                rootDir: '/',
                projectRoot: '/',
                log() {
                    /**/
                },
            }
        );

        expect(fs.readdirSync('/dist')).to.eql([
            'entry.css',
            'other.css',
            'relative.css',
            'custom-resolved.css',
        ]);
    });
});
