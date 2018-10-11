import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'split-by-depth';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname),
            port: 3001,
            puppeteerOptions: {
                headless: false,
                devtools: true
            }
        },
        before,
        afterEach,
        after
    );
    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const backgroundColor = await page.evaluate(() => {
            return getComputedStyle(document.documentElement).backgroundColor;
        });
        expect(backgroundColor).to.eql('rgb(255, 0, 0)');
    });
});
