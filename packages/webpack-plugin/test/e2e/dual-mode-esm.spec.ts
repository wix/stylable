import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const { getStyleElementsMetadata } = browserFunctions;

const project = 'dual-mode-esm';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                headless: false,
            },
            configName: 'webpack.config.js',
            buildPackages: ['./node_modules/component-library'],
        },
        before,
        afterEach,
        after
    );

    it('output same styles depth with both integrations', async () => {
        const vanillaBrowser = await projectRunner.openInBrowser({ internalPath: 'vanilla' });
        const vanillaStyles = await vanillaBrowser.page.evaluate(getStyleElementsMetadata);
        const stylableBrowser = await projectRunner.openInBrowser({ internalPath: 'stylable' });
        const stylableStyles = await stylableBrowser.page.evaluate(getStyleElementsMetadata);

        expect(vanillaStyles).to.eql(stylableStyles);
        
    });
});
