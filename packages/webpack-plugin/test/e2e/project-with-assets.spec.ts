import {
    browserFunctions,
    filterAssetResponses,
    StylableProjectRunner
} from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'project-with-assets';

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
        after
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);

        expect(styleElements).to.eql([{ id: './src/assets/assets.st.css', depth: '1' }]);
    });

    it('load assets from url() declaration value', async () => {
        const expectedAssets = ['asset.jpg', 'asset-in-root.png'];
        const { responses } = await projectRunner.openInBrowser();
        const assetResponses = filterAssetResponses(responses, expectedAssets);

        expect(assetResponses.length, 'all expected assets has matching responses').to.equal(
            expectedAssets.length
        );

        for (const response of assetResponses) {
            expect(response.ok(), `${response.url()} to be loaded`).to.equal(true);
        }
    });
});

describe(`(${project}) production mode`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                headless: false
            },
            webpackOptions: {
                mode: 'production'
            }
        },
        before,
        afterEach,
        after
    );

    it('load assets from url() declaration value', async () => {
        const expectedAssets = ['asset.jpg', 'asset-in-root.png'];
        const { responses } = await projectRunner.openInBrowser();
        const assetResponses = filterAssetResponses(responses, expectedAssets);

        expect(assetResponses.length, 'all expected assets has matching responses').to.equal(
            expectedAssets.length
        );

        for (const response of assetResponses) {
            expect(response.ok(), `${response.url()} to be loaded`).to.equal(true);
        }
    });
});
