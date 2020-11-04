import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'simple-production-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after
    );

    it('renders css', () => {
        const source = projectRunner.getBuildAsset('stylable.css');
        expect(source).to.equal('.s0{background-color:red}');
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const backgroundColor = await page.evaluate(() => {
            return getComputedStyle(document.documentElement).backgroundColor;
        });
        expect(backgroundColor).to.equal('rgb(255, 0, 0)');
    });
});
