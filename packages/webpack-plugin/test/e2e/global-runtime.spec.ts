import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'global-runtime';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            port: 3001,
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

        expect(styleElements).to.eql([
            { id: './src/index.st.css', depth: '1' },
            { id: './src/index2.st.css', depth: '1' }
        ]);
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const res = await page.evaluate(() => {

            return {
                runtimes: (window as any).__stylable_renderer_global_counter,
                index: getComputedStyle(document.querySelector('[data-name="index"]')!).backgroundColor,
                index2: getComputedStyle(document.querySelector('[data-name="index2"]')!).backgroundColor
            };
        });

        expect(res).to.eql({
            runtimes: 1,
            index: 'rgb(255, 0, 0)',
            index2: 'rgb(0, 128, 0)'
        });
    });
});
