import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'mixins-project';
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
        },
        before,
        afterEach,
        after,
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata, {
            includeCSSContent: true,
        });

        expect(styleElements[0]).to.include({
            id: './src/index.st.css',
            depth: '1',
        });
        expect(styleElements[0].css!.replace(/\s\s*/gm, ' ').trim()).to.match(
            /\.index\d+__root \{ arguments: \["1","2"\]; border: 1px solid rgb\(255, 0, 0\); z-index: 9; \}/,
        );
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const backgroundColor = await page.evaluate(() => {
            return getComputedStyle(document.documentElement).border;
        });

        expect(backgroundColor).to.eql('1px solid rgb(255, 0, 0)');
    });
});
