import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'duplicate-namespace-perserve-modules';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`),
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                devtools: true,

                headless: false,
            },
            throwOnBuildError: false,
        },
        before,
        afterEach,
        after,
    );

    it('renders css', async () => {
        // this fixture is pretty test specific, and depends on the module depth sorting order
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);
        const origins = await page.evaluate(() => {
            return {
                used: getComputedStyle(document.documentElement).color,
                // expecting unused to be dropped
                unused: getComputedStyle(document.documentElement).backgroundColor,
            };
        });

        expect(origins.used, 'used should be included').to.eql('rgb(0, 128, 0)');
        expect(origins.unused, 'unused should be dropped').to.not.eql('rgb(255, 0, 0)');

        expect(styleElements).to.eql([{ id: './src/used.st.css', depth: '2' }]);
    });
});
