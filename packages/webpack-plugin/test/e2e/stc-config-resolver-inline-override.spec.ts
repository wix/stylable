import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'stylable-config-resolver-inline-override';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/package.json`),
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
        after,
    );

    it('config is resolved and css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const { backgroundColor } = await page.evaluate(() => {
            const style = getComputedStyle(document.body);
            return {
                backgroundColor: style.backgroundColor,
            };
        });

        expect(backgroundColor).to.eql('rgb(0, 128, 0)');
    });
});
