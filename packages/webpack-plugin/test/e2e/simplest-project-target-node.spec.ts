import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'simplest-project-target-node';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false,
            },
        },
        before,
        afterEach,
        after
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);

        expect(styleElements).to.eql([
            { id: './node_modules/comp-lib/index.es.st.css', depth: '1' },
            { id: './src/index.st.css', depth: '2' },
        ]);
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const { backgroundColor, color } = await page.evaluate(() => {
            const style = getComputedStyle(document.body);
            return {
                color: style.color,
                backgroundColor: style.backgroundColor,
            };
        });

        expect(backgroundColor).to.eql('rgb(255, 0, 0)');
        expect(color).to.eql('rgb(128, 0, 128)');
    });
});
