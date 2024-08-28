import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';

const project = 'basic-integration';
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

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const cssLinks = await page.evaluate(browserFunctions.getCSSLinks);

        expect(cssLinks).to.eql(['main.css']);
    });

    it('output buildInfo', () => {
        const manifest = JSON.parse(
            readFileSync(join(projectRunner.outputDir, 'test-manifest.json'), 'utf8'),
        );
        expect(manifest).to.eql({
            'foo.st.css': 'foo',
            'index.st.css': 'index',
        });
    });

    it('css applied correctly', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styles = await page.evaluate(() => {
            const hello = getComputedStyle(document.querySelector('.foo__hello')!);
            const world = getComputedStyle(document.querySelector('.foo__world')!);

            return {
                hello: {
                    color: hello.color,
                    height: hello.height,
                    imageAsset: hello.backgroundImage.match(/(\w+\.png)/)![1],
                },
                world: {
                    color: world.color,
                },
            };
        });

        expect(styles).to.deep.include({
            hello: {
                color: 'rgb(255, 0, 0)',
                height: '500px',
                imageAsset: 'c1581c599fef18f7460c.png',
            },
            world: {
                color: 'rgb(0, 0, 255)',
            },
        });
    });
});
