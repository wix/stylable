import { writeFileSync, renameSync } from 'fs';
import { dirname, join } from 'path';
import { expect } from 'chai';
import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';

const project = 'watched-project';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after,
        true
    );
    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata, {
            includeCSSContent: true,
        });

        expect(styleElements[0]).to.include({
            id: './src/index.st.css',
            depth: '3',
        });

        expect(styleElements[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
            /\.index\d+__root \{ color: red; font-size: 3em; z-index: 1; \}/
        );

        await projectRunner.actAndWaitForRecompile(
            'invalidate dependency',
            () => {
                writeFileSync(
                    join(projectRunner.projectDir, 'src', 'mixin-b.st.css'),
                    '.b{ color: green; }'
                );
            },
            async () => {
                await page.reload();
                const styleElements = await page.evaluate(
                    browserFunctions.getStyleElementsMetadata,
                    {
                        includeCSSContent: true,
                    }
                );
                expect(styleElements[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
                    /\.index\d+__root \{ color: green; font-size: 3em; z-index: 1; \}/
                );
            }
        );
    });

    it('allow stylable imports with missing files', async () => {
        await projectRunner.actAndWaitForRecompile(
            'rename files with invalid dependencies',
            () => {
                renameSync(
                    join(projectRunner.projectDir, 'src', 'index.st.css'),
                    join(projectRunner.projectDir, 'src', 'xxx.st.css')
                );
            },
            () => {
                // if we got here we finished to recompile with the missing file.
                // when this test is broken the compiler had en error and exit the process.
                expect('finish recompile');
            }
        );
    });
});
