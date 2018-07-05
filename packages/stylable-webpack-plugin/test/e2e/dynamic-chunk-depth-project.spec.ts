import { expect } from 'chai';
import { join } from 'path';
import { browserFunctions, StylableProjectRunner } from 'stylable-build-test-kit';

const project = 'dynamic-chunk-depth-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
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
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);

        expect(styleElements).to.eql([
            { id: './src/button.st.css', depth: '1' },
            { id: './src/gallery.st.css', depth: '2' }
        ]);
    });
});
