import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { promises } from 'fs';
import { dirname, join } from 'path';
import { waitFor } from 'promise-assist';

const project = 'deep-js';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
            useTempDir: true,
            watchMode: true,
        },
        before,
        afterEach,
        after
    );

    it('deep invalidation from javascript file', async () => {
        const { page } = await projectRunner.openInBrowser();
        const color = await page.evaluate(() => (window as any).backgroundColorAtLoadTime);

        expect(color).to.eql('rgb(255, 0, 0)');

        await projectRunner.actAndWaitForRecompile(
            'update js mixin only and expect css to be invalidated',
            () =>
                promises.writeFile(
                    join(projectRunner.testDir, 'src', 'mixin.js'),
                    `module.exports = () => ({ color: 'green' });`
                ),
            () =>
                waitFor(
                    async () => {
                        await page.reload();
                        const updatedColor = await page.evaluate(
                            () => (window as any).backgroundColorAtLoadTime
                        );

                        expect(updatedColor).to.eql('rgb(0, 128, 0)');
                    },
                    { timeout: 10_000 }
                )
        );
    });
});
