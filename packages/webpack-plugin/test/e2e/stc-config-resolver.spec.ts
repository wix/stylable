import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'stylable-config-resolver';
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
        const { backgroundColor, color } = await page.evaluate(() => {
            const style = getComputedStyle(document.body);
            return {
                color: style.color,
                backgroundColor: style.backgroundColor,
            };
        });

        expect(backgroundColor, 'should be resolved to green through webpack alias').to.eql(
            'rgb(0, 128, 0)',
        );
        expect(color, 'should be resolved to blue through typescript paths').to.eql(
            'rgb(0, 0, 255)',
        );
    });
});
