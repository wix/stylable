import { expect } from 'chai';
import { join } from 'path';
import { browserFunctions, StylableProjectRunner } from 'stylable-build-test-kit';

const project = 'hooked-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', 'hooked-project'),
            port: 3001,
            puppeteerOptions: {
                // headless: false
            }
        },
        before,
        afterEach,
        after
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata, true);

        expect(styleElements[0]).to.include({
            id: './src/index.st.css',
            depth: '1'
        });

        expect(styleElements[0].css.replace(/\s\s*/gm, ' ').trim()).to.equal(
            `.o0--root { background-color: hook_var_1; background-color: rgb(1, 0, 0); }`
        );
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const backgroundColor = await page.evaluate(() => {
            return getComputedStyle(document.documentElement).backgroundColor;
        });

        expect(backgroundColor).to.eql('rgb(1, 0, 0)');
    });
});
