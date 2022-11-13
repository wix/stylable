import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'globals';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            webpackOptions: {
                mode: 'production',
            },
            projectDir,
            launchOptions: {
                headless: false,
            },
        },
        before,
        afterEach,
        after
    );

    it('should preserve global classes and custom properties', async () => {
        const { page } = await projectRunner.openInBrowser();

        const { classList, localGlobal, libGlobal, libMultiGlobal1, libMultiGlobal2 } =
            await page.evaluate(() => {
                const win = window as any;
                const computedStyle = getComputedStyle(win.document.body);
                return {
                    classList: win.document.body.getAttribute('class'),
                    localGlobal: computedStyle.getPropertyValue('--local-global'),
                    libGlobal: computedStyle.getPropertyValue('--lib-global'),
                    libMultiGlobal1: computedStyle.getPropertyValue('--lib-multi-global-1'),
                    libMultiGlobal2: computedStyle.getPropertyValue('--lib-multi-global-2'),
                };
            });
        expect(classList, 'classes').to.eql('s1 loc-glob lib-glob s2 lib1 lib2');
        expect(localGlobal, 'extend local global').to.eql(' from local global');
        expect(libGlobal, 'extend lib global').to.eql(' from lib global');
        expect(libMultiGlobal1, 'extend lib multi global 1').to.eql(' from lib multi global 1');
        expect(libMultiGlobal2, 'extend lib multi global 2').to.eql(' from lib multi global 2');
    });
});
