import { expect } from 'chai';
import { join } from 'path';
import { browserFunctions, StylableProjectRunner } from 'stylable-build-test-kit';

const project = '3rd-party';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            port: 3002,
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
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);

        expect(styleElements).to.eql([
            { id: './node_modules/test-components/button.st.css', depth: '1' },
            {
                id: './node_modules/test-components/index.st.css',
                depth: '2'
            },
            { id: './src/index.st.css', depth: '3' }
        ]);
    });

    it('override 3rd party', async () => {
        const { page } = await projectRunner.openInBrowser();
        const backgroundColor = await page.evaluate(() => {
            return getComputedStyle((window as any).btn).backgroundColor;
        });
        expect(backgroundColor).to.eql('rgb(0, 128, 0)');
    });
});
