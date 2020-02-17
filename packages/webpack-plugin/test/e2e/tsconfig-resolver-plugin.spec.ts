import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'tsconfig-resolver-plugin';

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

    it('override 3rd party', async () => {
        const { page } = await projectRunner.openInBrowser();
        const backgroundColor = await page.evaluate(() => {
            return getComputedStyle((window as any).btn).backgroundColor;
        });
        expect(backgroundColor).to.eql('rgb(0, 128, 0)');
    });
});
