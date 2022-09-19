import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'dual-mode-esm';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);
for (const configName of ['stylable-webpack.config.js', 'webpack.config.js']) {
    `${configName}`;
}
describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                headless: false,
            },
            configName: 'webpack.config.js',
            buildPackages: ['./node_modules/comps'],
            // configName: 'stylable-webpack.config.js',
        },
        before,
        afterEach,
        after
    );

    it.only('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);
    });
});
