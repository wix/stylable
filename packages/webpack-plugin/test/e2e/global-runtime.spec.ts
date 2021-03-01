import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'global-runtime';
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
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata, {
            includeRuntimeId: true,
            includeCSSContent: false,
        });

        expect(styleElements).to.eql([
            { id: './src/index.st.css', depth: '1', runtime: 'test' },
            { id: './src/index2.st.css', depth: '1', runtime: 'test' },
        ]);
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const res = await page.evaluate(() => {
            return {
                index: getComputedStyle(document.querySelector('[data-name="index"]')!)
                    .backgroundColor,
                index2: getComputedStyle(document.querySelector('[data-name="index2"]')!)
                    .backgroundColor,
            };
        });

        expect(res).to.eql({
            index: 'rgb(255, 0, 0)',
            index2: 'rgb(0, 128, 0)',
        });
    });
});
