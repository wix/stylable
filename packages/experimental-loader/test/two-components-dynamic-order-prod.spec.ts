import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname, join } from 'path';

const project = 'two-components-dynamic-order';
const projectDir = dirname(
    require.resolve(`@stylable/experimental-loader/test/projects/${project}/webpack.config`)
);

describe(`(${project}) (production)`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false,
            },
            webpackOptions: {
                mode: 'production',
                output: { path: join(projectDir, 'dist-prod', project) },
            },
        },
        before,
        afterEach,
        after
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const cssLinks = await page.evaluate(browserFunctions.getCSSLinks);
        const linkPaths = cssLinks.map((l) => (l ? new URL(l).pathname : l));

        expect(linkPaths).to.eql(['/compA.css', '/compB.css']);
    });

    it('not output dev st directives', () => {
        const css = projectRunner.getBuildAsset('compB.css');

        expect(css).to.not.include('-st-extends');
        expect(css).to.not.include('class extending component');
    });

    it('css applied correctly', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styles = await page.evaluate(() => {
            const compA = getComputedStyle(document.querySelectorAll('.a__root')[0]!);
            const compB = getComputedStyle(document.querySelector('.b__root')!);

            return {
                compB: {
                    color: compB.color,
                    backgroundColor: compB.backgroundColor,
                },
                compA: {
                    color: compA.color,
                },
            };
        });

        expect(styles).to.deep.include({
            compB: {
                color: 'rgb(255, 0, 0)',
                backgroundColor: 'rgb(255, 255, 0)',
            },
            compA: {
                color: 'rgb(128, 0, 128)',
            },
        });
    });
});
