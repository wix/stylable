import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'mini-css-extract';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`),
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
        const links = await page.evaluate(browserFunctions.getCSSLinks);

        expect(links[0]).to.equal('main.css');
        expect(links[1]).to.match(/src_dynamic_js/);
        expect(links).to.have.length(2);
    });

    it('css is injected before entry running', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styles = await page.evaluate(() => {
            return {
                backgroundColorAtLoadTime: (window as any).backgroundColorAtLoadTime,
                colorOfDynamicComponent: (window as any).colorOfDynamicComponent,
            };
        });

        expect(styles).to.eql({
            backgroundColorAtLoadTime: 'rgb(255, 0, 0)',
            colorOfDynamicComponent: 'rgb(0, 0, 255)',
        });
    });
});
