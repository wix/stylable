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
        const vanillaStyles = await vanillaBrowser.page.evaluate(getStyleElementsMetadata);
        const stylableBrowser = await projectRunner.openInBrowser({ internalPath: 'stylable' });
        const stylableStyles = await stylableBrowser.page.evaluate(getStyleElementsMetadata);

        const { buttonColor, labelFontSize } = await vanillaBrowser.page.evaluate(() => {
            return {
                buttonColor: getComputedStyle(document.querySelector('#btn')!).backgroundColor,
                labelFontSize: getComputedStyle(document.querySelector('#label')!).fontSize,
            };
        });

        expect(buttonColor).to.eql('rgb(0, 255, 0)');
        expect(labelFontSize).to.eql('50px');

        expect(vanillaStyles).to.eql(stylableStyles);

        expect(normalizeNamespace(vanillaStyles)).to.eql([
            { id: 'designsystem', depth: '0' },
            { id: 'label', depth: '0' },
            { id: 'button', depth: '1' },
            { id: 'basictheme', depth: '2' },
            { id: 'labeltheme', depth: '3' },
            { id: 'buttontheme', depth: '3' },
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
