import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';
import type { Page } from 'playwright-core';

const project = 'multiple-chunks-split-depend-on';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`),
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false,
                // devtools: true,
            },
        },
        before,
        afterEach,
        after,
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();

        expect(() => {
            projectRunner.getBuildAsset('a.css');
        }).throws('no such file or directory');
        const b = projectRunner.getBuildAsset('b.css');
        expect(b).to.match(/red/);
        expect(b).to.match(/green/);

        expect(await getComputedColor(page, 'Hello From A')).to.eql(`rgb(255, 0, 0)`);
        expect(await getComputedColor(page, 'Hello From B')).to.eql(`rgb(0, 128, 0)`);
    });
});

function getComputedColor(page: Page, text: string) {
    return page.$eval('text=' + text, (el) => window.getComputedStyle(el).color);
}
