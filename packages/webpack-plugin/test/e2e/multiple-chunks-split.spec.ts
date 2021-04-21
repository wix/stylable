import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';
import type { Page } from 'playwright-core';

const project = 'multiple-chunks-split';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false,
                // devtools: true
            },
        },
        before,
        afterEach,
        after
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();

        const a = projectRunner.getBuildAsset('a.css');
        const b = projectRunner.getBuildAsset('b.css');
        expect(a).to.not.be.empty;
        expect(b).to.not.be.empty;
        expect(a).to.not.equal(b);

        expect(await getComputedColor(page, 'Hello From Common')).to.eql(`rgb(210, 105, 30)`);
        expect(await getComputedColor(page, 'Hello From A')).to.eql(`rgb(255, 0, 0)`);
        expect(await getComputedColor(page, 'Hello From B')).to.eql(`rgb(0, 128, 0)`);
        expect(await getComputedColor(page, 'Hello From A Dynamic')).to.eql(`rgb(128, 0, 128)`);
        expect(await getComputedColor(page, 'Hello From B Dynamic')).to.eql(`rgb(255, 255, 0)`);
        expect(await getComputedColor(page, 'Hello From A Inner Dynamic')).to.eql(
            `rgb(165, 42, 42)`
        );
        expect(await getComputedColor(page, 'Hello From B Inner Dynamic')).to.eql(
            `rgb(127, 255, 212)`
        );
    });
});

function getComputedColor(page: Page, text: string) {
    return page.$eval('text=' + text, (el) => window.getComputedStyle(el).color);
}
