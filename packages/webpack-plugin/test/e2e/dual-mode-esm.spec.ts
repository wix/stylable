import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const { getStyleElementsMetadata } = browserFunctions;

const project = 'dual-mode-esm';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                headless: false,
            },
            configName: 'webpack.config.js',
            buildPackages: ['./node_modules/component-library'],
        },
        before,
        afterEach,
        after
    );

    it('output same styles depth with both integrations', async () => {
        const vanillaBrowser = await projectRunner.openInBrowser({ internalPath: 'vanilla' });
        const vanillaStyles = await vanillaBrowser.page.evaluate(getStyleElementsMetadata, {
            includeRuntimeId: true,
        });
        const stylableBrowser = await projectRunner.openInBrowser({ internalPath: 'stylable' });
        const stylableStyles = await stylableBrowser.page.evaluate(getStyleElementsMetadata, {
            includeRuntimeId: true,
        });

        const { buttonColor, labelFontSize } = await vanillaBrowser.page.evaluate(() => {
            return {
                buttonColor: getComputedStyle(document.querySelector('#btn')!).backgroundColor,
                labelFontSize: getComputedStyle(document.querySelector('#label')!).fontSize,
            };
        });

        expect(buttonColor).to.eql('rgb(0, 255, 0)');
        expect(labelFontSize).to.eql('50px');

        const vanillaStylesNoRuntime = vanillaStyles.map(({ runtime, id, depth }) => {
            expect(runtime).to.eql('esm');
            return {
                id,
                depth,
            };
        });

        const stylableStylesNoRuntime = stylableStyles.map(({ runtime, id, depth }) => {
            expect(runtime).to.eql('0');
            return {
                id,
                depth,
            };
        });

        expect(vanillaStylesNoRuntime).to.eql(stylableStylesNoRuntime);

        expect(normalizeNamespace(vanillaStyles)).to.eql([
            { id: 'design-system', depth: '1' },
            { id: 'label', depth: '1' },
            { id: 'button', depth: '2' },
            { id: 'basic-theme', depth: '3' },
            { id: 'label-theme', depth: '4' },
            { id: 'button-theme', depth: '4' },
        ]);
    });
});

function normalizeNamespace(styles: Array<{ id?: string; depth?: string }>) {
    return styles.map(({ id, depth }) => {
        return {
            id: id && id.replace(/\d+/g, ''),
            depth,
        };
    });
}
