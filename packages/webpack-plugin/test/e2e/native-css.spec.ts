import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'native-css';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            webpackOptions: {
                mode: 'development',
            },
            launchOptions: {
                // headless: false,
            },
        },
        before,
        afterEach,
        after
    );

    it('include native CSS imports from local and 3rd party', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);

        const {
            localSideEffect,
            libSideEffect,
            libClass,
            localColor,
            libColor,
            customResolveColor,
            customResolveSideEffect,
        } = await page.evaluate(() => {
            const computedStyle = getComputedStyle((window as any).document.body);
            return {
                localSideEffect: computedStyle.getPropertyValue('--local-side-effect'),
                libSideEffect: computedStyle.getPropertyValue('--lib-side-effect'),
                libClass: computedStyle.getPropertyValue('--lib-class'),
                localColor: computedStyle.backgroundColor,
                libColor: computedStyle.color,
                customResolveColor: computedStyle.borderColor,
                customResolveSideEffect: computedStyle.getPropertyValue(
                    '--custom-resolved-side-effect'
                ),
            };
        });
        expect(localSideEffect, 'local side effect').to.eql(' from local side-effect');
        expect(customResolveSideEffect, 'custom resolve side effect').to.eql(
            ' from custom resolved side-effect'
        );
        expect(libSideEffect, 'lib side effect').to.eql(' from lib side-effect');
        expect(libClass, 'lib class').to.eql(' from lib class');
        expect(localColor, 'local import prop').to.eql('rgb(0, 128, 0)');
        expect(libColor, 'lib import prop').to.eql('rgb(0, 100, 0)');
        expect(customResolveColor, 'custom resolve import prop').to.eql('rgb(128, 0, 128)');

        expect(styleElements).to.eql([
            { id: './node_modules/test-components/lib.css', depth: '0' },
            { id: './src/local.css', depth: '0' },
            { id: './src/custom-resolved.css', depth: '0' },
            { id: './src/index.st.css', depth: '1' },
        ]);
    });
});

describe(`(${project}) (production)`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            webpackOptions: {
                mode: 'production',
            },
            launchOptions: {
                // headless: false,
            },
        },
        before,
        afterEach,
        after
    );

    it('include native CSS imports from local and 3rd party', async () => {
        const { page } = await projectRunner.openInBrowser();

        const { nativeClassProp } = await page.evaluate(() => {
            const element = document.querySelector('.native-class');
            const computedStyle = getComputedStyle(element!);
            return {
                nativeClassProp: computedStyle.getPropertyValue('--native-class'),
            };
        });
        expect(nativeClassProp, 'un-optimized native class').to.eql(
            'from local un-optimized class'
        );
    });
});
