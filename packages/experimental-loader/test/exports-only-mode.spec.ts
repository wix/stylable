import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'exports-only-mode';
const projectDir = dirname(
    require.resolve(`@stylable/experimental-loader/test/projects/${project}/webpack.config`),
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false,
            },
        },
        before,
        afterEach,
        after,
    );

    it('load the stylable exports', async () => {
        const { page } = await projectRunner.openInBrowser();
        const { classes, styleFunctionType } = await page.evaluate(() => {
            const classes = document.querySelector('.exports-classes')!.textContent;
            const styleFunctionType =
                document.querySelector('.exports-style-function')!.textContent;

            return {
                classes,
                styleFunctionType,
            };
        });
        expect(JSON.parse(String(classes))).to.eql({
            root: 'index__root',
        });

        expect(styleFunctionType).to.eql('function');
    });
});
