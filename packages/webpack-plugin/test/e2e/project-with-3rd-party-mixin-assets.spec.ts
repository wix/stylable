import {
    browserFunctions,
    filterAssetResponses,
    StylableProjectRunner,
} from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'project-with-3rd-party-mixin-assets';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);

        expect(styleElements).to.eql([{ id: './src/index.st.css', depth: '2' }]);
    });

    it('load assets from url() declaration value', async () => {
        const expectedAssets = ['asset1.png', 'asset2.png', 'asset.png', 'deep.png'];
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
