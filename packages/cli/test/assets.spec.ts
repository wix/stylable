import { expect } from 'chai';
import { Stylable } from '@stylable/core';
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
            `,
            '/src/relative.css': '.native {}',
            '/src/custom-resolved.css': '.resolved {}',
            '/src/other.st.css': '.other {}',
        });
        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
            resolveModule: (path, request) => {
                if (request === './resolved-me') {
                    return '/src/custom-resolved.css';
                }
                return fs.resolve(path, request);
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

        ['/dist/entry.css', '/dist/relative.css', '/dist/custom-resolved.css'].forEach((p) => {
            expect(fs.existsSync(p), p).to.equal(true);
        });
        ['/dist/other.st.css'].forEach((p) => {
            expect(fs.existsSync(p), p).to.equal(false);
        });
    });
});
