import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'unsafe-mute-diagnostics';

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

    it('should build a project with no errors (duplicate namespace) when muted', async () => {
        expect(projectRunner.getBuildErrorMessages().length).to.equal(0);
        expect(projectRunner.getBuildWarningMessages().length).to.equal(0);
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const backgroundColor = await page.evaluate(() => {
            return getComputedStyle(document.documentElement!).backgroundColor;
        });

        expect(backgroundColor).to.eql('rgb(0, 128, 0)');
    });
});
