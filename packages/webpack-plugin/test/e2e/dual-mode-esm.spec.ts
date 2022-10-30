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
                // headless: false,
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

        expect(vanillaStyles).to.eql(stylableStyles);

        expect(normalizeNamespace(vanillaStyles)).to.eql([
            { id: 'designsystem', depth: '-1' },
            { id: 'label', depth: '-1' },
            { id: 'button', depth: '0' },
            { id: 'labeltheme', depth: '2' },
            { id: 'buttontheme', depth: '2' },
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
