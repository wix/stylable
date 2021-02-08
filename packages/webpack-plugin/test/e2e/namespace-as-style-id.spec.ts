import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'namespace-as-style-id';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            launchOptions: {
                // headless: false
            },
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

    it('style id is the namespace', async () => {
        const { page } = await projectRunner.openInBrowser();
        const res = await page.evaluate(() => {
            return {
                gotStyleByNamespace: (window as any).gotStyleByNamespace,
            };
        });

        expect(res.gotStyleByNamespace, 'gotStyleByNamespace').to.eql(true);
    });
});
