import { writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import { expect } from 'chai';
import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';

const project = 'watched-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
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

        const recompile = new Promise<void>((res) => {
            projectRunner.compiler?.hooks.done.tap('Test', () => {
                res();
            });
        });

        writeFileSync(
            join(projectRunner.projectDir, 'src', 'mixin-b.st.css'),
            '.b{ color: green; }'
        );
        await recompile;
        await page.reload();
        const styleElements2 = await page.evaluate(browserFunctions.getStyleElementsMetadata, {
            includeCSSContent: true,
        });
        expect(styleElements2[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
            /\.index\d+__root \{ color: green; font-size: 3em; z-index: 1; \}/
        );
    });

    it('allow stylable imports with missing files', async () => {
        renameSync(
            join(projectRunner.projectDir, 'src', 'index.st.css'),
            join(projectRunner.projectDir, 'src', 'xxx.st.css')
        );

        const recompile = new Promise<void>((res) => {
            projectRunner.compiler?.hooks.done.tap('Test', () => {
                res();
            });
        });

        await recompile;
        // if we got here we finished to recompile with the missing file.
        // when this test is broken the compiler had en error and exit the process.
        expect('finish recompile');
    });
});
