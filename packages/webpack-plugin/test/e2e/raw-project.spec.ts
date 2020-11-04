import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'raw-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after
    );

    it('loading is working for raw-loader', async () => {
        const { page } = await projectRunner.openInBrowser();
        const text = await page.evaluate(() => {
            return {
                css: (window as any).css,
                index: (window as any).index,
            };
        });
        expect(text.index).to.match(/\/\* CONTENT \*\//);
        expect(text.css).to.equal('data:text/css;charset=utf-8;base64,LyogQ09OVEVOVCAqLw==');
    });
});
