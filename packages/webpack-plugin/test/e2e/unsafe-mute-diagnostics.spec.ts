import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'unsafe-mute-diagnostics';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`),
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

    it('should build a project with no errors (duplicate namespace) when muted', () => {
        expect(projectRunner.getBuildErrorMessages().length).to.equal(0);
        expect(projectRunner.getBuildWarningMessages().length).to.equal(0);
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const backgroundColor = await page.evaluate(() => {
            return getComputedStyle(document.documentElement).backgroundColor;
        });

        expect(backgroundColor).to.eql('rgb(0, 128, 0)');
    });
});
