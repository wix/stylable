import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'st-border';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                // headless: false
            }
        },
        before,
        afterEach,
        after
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);

        expect(styleElements).to.eql([{ id: './src/index.st.css', depth: '1' }]);
    });

    it('css is injected before entry running', async () => {
        const { page } = await projectRunner.openInBrowser();
        const { myBorder, myColor } = await page.evaluate(() => {
            return {
                myBorder: (window as any).myBorder,
                myColor: (window as any).myColor
            };
        });

        expect(myBorder).to.eql('1px solid rgb(0, 128, 0)');
        expect(myColor).to.eql('rgb(0, 128, 0)');
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const border = await page.evaluate(() => {
            return getComputedStyle(document.documentElement!).border;
        });

        expect(border).to.eql('1px solid rgb(0, 128, 0)');
    });
});
