import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'resolve-js-with-context';
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

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const color = await page.evaluate(() => {
            return getComputedStyle(document.documentElement).color;
        });

        expect(color).to.eql('rgb(255, 0, 0)');
    });
});
