import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'mixin-extended-scoping';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                headless: false
            }
        },
        before,
        afterEach,
        after
    );

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const color = await page.evaluate(() => {
            return getComputedStyle(document.documentElement!).color;
        });

        expect(color).to.eql('rgb(255, 0, 0)');
    });
});
