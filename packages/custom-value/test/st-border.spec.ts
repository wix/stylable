import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'st-border';
const projectDir = dirname(
    require.resolve(`@stylable/custom-value/test/projects/${project}/webpack.config`)
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
        console.log('Test Started');
        const { page } = await projectRunner.openInBrowser();
        console.log('Page opened');
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);
        console.log('Style elements found');

        expect(styleElements).to.eql([{ id: './src/index.st.css', depth: '1' }]);
    });

    it('css is injected before entry running', async () => {
        const { page } = await projectRunner.openInBrowser();
        const { myBorder, myColor } = await page.evaluate(() => {
            return {
                myBorder: (window as any).myBorder,
                myColor: (window as any).myColor,
            };
        });

        expect(myBorder).to.eql('1px solid rgb(0, 128, 0)');
        expect(myColor).to.eql('rgb(0, 128, 0)');
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const border = await page.evaluate(() => {
            return getComputedStyle(document.documentElement).border;
        });

        expect(border).to.eql('1px solid rgb(0, 128, 0)');
    });
});
