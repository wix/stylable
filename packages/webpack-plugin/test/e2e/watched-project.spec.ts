import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'watched-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                // headless: false
            }
        },
        before,
        afterEach,
        after,
        true
    );
    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata, true);

        expect(styleElements[0]).to.include({
            id: './src/index.st.css',
            depth: '3'
        });

        expect(styleElements[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
            /\.index\d+__root \{ color: red; font-size: 3em; z-index: 1; \}/
        );

        const recompile = new Promise(res => {
            projectRunner.compiler?.hooks.done.tap('Test', () => {
                res();
                console.log('done')
            });
        });

        require('fs').writeFileSync(
            join(projectRunner.projectDir, 'src', 'mixin-b.st.css'),
            '.b{ color: green; }'
        );
        await recompile;
        await page.reload();
        const styleElements2 = await page.evaluate(browserFunctions.getStyleElementsMetadata, true);
        expect(styleElements2[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
            /\.index\d+__root \{ color: green; font-size: 3em; z-index: 1; \}/
        );
    });
});
