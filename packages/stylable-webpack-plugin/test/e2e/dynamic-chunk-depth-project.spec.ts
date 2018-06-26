const { expect } = require('chai');
const { join } = require('path');
import { browserFunctions, StylableProjectRunner as ProjectRunner } from 'stylable-build-test-kit';

const projectFixtures = join(__dirname, 'projects');

describe('(dynamic-chunk-depth-project)', () => {
    const projectRunner = ProjectRunner.mochaSetup(
        {
            projectDir: join(projectFixtures, 'dynamic-chunk-depth-project'),
            port: 3001,
            puppeteerOptions: {
                headless: false
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
