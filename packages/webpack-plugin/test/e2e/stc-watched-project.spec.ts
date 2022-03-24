import { promises } from 'fs';
import { dirname, join } from 'path';
import { expect } from 'chai';
import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';

const { writeFile } = promises;

const project = 'stc-watched-project';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false,
            },
            watchMode: true,
            useTempDir: true,
        },
        before,
        afterEach,
        after
    );
    it('build "stc" and webpack out in the correct order', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata, {
            includeCSSContent: true,
        });

        expect(styleElements[0]).to.include({
            id: './src/index.st.css',
        });

        expect(styleElements[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
            /\.index\d+__root \{ color: red; z-index: 1; \}/
        );

        await projectRunner.actAndWaitForRecompile(
            'new source file',
            async () => {
                await writeFile(
                    join(projectRunner.testDir, 'style-source', 'style-b.st.css'),
                    '.b{ color: green; }'
                );

                await writeFile(
                    join(projectRunner.testDir, 'src', 'index.st.css'),
                    `
                    @st-import [b] from '../style-output/style-b.st.css';
                    
                    .root {
                        -st-mixin: b;
                        z-index: 1;
                    }
                `
                );
            },
            async () => {
                const { page } = await projectRunner.openInBrowser();
                const styleElements = await page.evaluate(
                    browserFunctions.getStyleElementsMetadata,
                    {
                        includeCSSContent: true,
                    }
                );
                expect(styleElements[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
                    /\.index\d+__root \{ color: green; z-index: 1; \}/
                );
            }
        );

        await projectRunner.actAndWaitForRecompile(
            'update new source file and expect the new style to be applied on the consumer',
            async () => {
                await writeFile(
                    join(projectRunner.testDir, 'style-source', 'style-b.st.css'),
                    '.b{ color: blue; }'
                );
            },
            async () => {
                const { page } = await projectRunner.openInBrowser();
                const styleElements = await page.evaluate(
                    browserFunctions.getStyleElementsMetadata,
                    {
                        includeCSSContent: true,
                    }
                );
                expect(styleElements[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
                    /\.index\d+__root \{ color: blue; z-index: 1; \}/
                );
            }
        );
    });
});
