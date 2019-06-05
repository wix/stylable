import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'runtime-legacy';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                headless: false,
                devtools: true
            }
        },
        before,
        afterEach,
        after
    );

    it('css renders with legacy runtime', async () => {
        const { page } = await projectRunner.openInBrowser();
        const { backgroundColor } = await page.evaluate(() => {
            const computedStyle = getComputedStyle(document.documentElement!);

            return {
                backgroundColor: computedStyle.backgroundColor
            };
        });
       
        expect(backgroundColor).to.eql('rgb(255, 0, 0)');
        
    });
});
