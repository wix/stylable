import { promises } from 'fs';
import { dirname, join } from 'path';
import { expect } from 'chai';
import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { waitFor } from 'promise-assist';

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
    it('build "stc" and webpack in the correct order', async () => {
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
            () =>
                writeFile(
                    join(projectRunner.testDir, 'style-source', 'style-b.st.css'),
                    '.b{ color: green; }'
                ),
            () =>
                waitFor(() => {
                    expect(projectRunner.getProjectFiles()['style-output/style-b.st.css']).to.eql(
                        '.b{ color: green; }'
                    );
                })
        );

        await projectRunner.actAndWaitForRecompile(
            'update existing file',
            () =>
                writeFile(
                    join(projectRunner.testDir, 'src', 'index.st.css'),
                    `
                    @st-import [b] from '../style-output/style-b.st.css';
                    
                    .root {
                        -st-mixin: b;
                        z-index: 1;
                    }
                `
                ),
            () =>
                waitFor(async () => {
                    await page.reload();
                    const styleElements = await page.evaluate(
                        browserFunctions.getStyleElementsMetadata,
                        {
                            includeCSSContent: true,
                        }
                    );
                    expect(styleElements[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
                        /\.index\d+__root \{ color: green; z-index: 1; \}/
                    );
                })
        );

        await projectRunner.actAndWaitForRecompile(
            'update new source file and expect the new style to be applied on the consumer',
            () =>
                writeFile(
                    join(projectRunner.testDir, 'style-source', 'style-b.st.css'),
                    '.b{ color: blue; }'
                ),
            () =>
                waitFor(
                    async () => {
                        expect(
                            projectRunner.getProjectFiles()['style-output/style-b.st.css']
                        ).to.eql('.b{ color: blue; }');

                        await page.reload();
                        const styleElements = await page.evaluate(
                            browserFunctions.getStyleElementsMetadata,
                            {
                                includeCSSContent: true,
                            }
                        );
                        expect(styleElements[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
                            /\.index\d+__root \{ color: blue; z-index: 1; \}/
                        );
                    },
                    { timeout: 5_000, delay: 0 }
                )
        );
    });
});
