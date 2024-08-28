import { promises } from 'fs';
import { dirname, join } from 'path';
import { expect } from 'chai';
import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';

const { writeFile, rename } = promises;

const project = 'watched-project';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`),
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
            watchMode: true,
            useTempDir: true,
        },
        before,
        afterEach,
        after,
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
            /\.index\d+__root \{ color: red; font-size: 3em; z-index: 1; \}/,
        );

        await projectRunner.actAndWaitForRecompile(
            'invalidate dependency',
            () => {
                return writeFile(
                    join(projectRunner.testDir, 'src', 'mixin-b.st.css'),
                    '.b{ color: green; }',
                );
            },
            async () => {
                const { page } = await projectRunner.openInBrowser();
                const styleElements = await page.evaluate(
                    browserFunctions.getStyleElementsMetadata,
                    {
                        includeCSSContent: true,
                    },
                );
                expect(styleElements[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
                    /\.index\d+__root \{ color: green; font-size: 3em; z-index: 1; \}/,
                );
            },
        );
    });

    it('allow stylable imports with missing files', async () => {
        await projectRunner.actAndWaitForRecompile(
            'rename files with invalid dependencies',
            () => {
                return rename(
                    join(projectRunner.testDir, 'src', 'index.st.css'),
                    join(projectRunner.testDir, 'src', 'xxx.st.css'),
                );
            },
            () => {
                // if we got here we finished to recompile with the missing file.
                // when this test is broken the compiler had en error and exit the process.
                expect('finish recompile');
            },
        );
    });
});
