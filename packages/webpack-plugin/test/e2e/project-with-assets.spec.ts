import {
    browserFunctions,
    filterAssetResponses,
    StylableProjectRunner,
} from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname, join } from 'path';

const project = 'project-with-assets';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

const expectedAssets = ['asset.png', 'asset-in-root.png', 'mandela.svg'];

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
            webpackOptions: {
                output: { path: join(projectDir, 'dist2') },
            },
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

    it('load assets from url() declaration value (dev)', async () => {
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
            projectDir,
            launchOptions: {
                // headless: false
            },
            webpackOptions: {
                mode: 'production',
                output: { path: join(projectDir, 'dist3') },
            },
        },
        before,
        afterEach,
        after
    );

    it('load assets from url() declaration value (prod)', async () => {
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
