import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname, join } from 'path';

const project = 'simplest-project';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`),
);

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
        after,
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);

        expect(styleElements).to.eql([{ id: './src/index.st.css', depth: '1' }]);
    });

    it('css is injected before entry running', async () => {
        const { page } = await projectRunner.openInBrowser();
        const backgroundColor = await page.evaluate(() => {
            return (window as any).backgroundColorAtLoadTime;
        });

        expect(backgroundColor).to.eql('rgb(255, 0, 0)');
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const backgroundColor = await page.evaluate(() => {
            return getComputedStyle(document.documentElement).backgroundColor;
        });

        expect(backgroundColor).to.eql('rgb(255, 0, 0)');
    });
});
