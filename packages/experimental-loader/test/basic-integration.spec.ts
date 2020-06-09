import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'basic-integration';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                // headless: false,
            },
        },
        before,
        afterEach,
        after
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const cssLinks = await page.evaluate(browserFunctions.getCSSLinks);

        expect(cssLinks).to.eql(['main.css']);
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
                imageAsset: 'c1581c599fef18f7460cd972e77273fd.png',
            },
            world: {
                color: 'rgb(0, 0, 255)',
            },
        });
    });
});
