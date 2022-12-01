import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname, join } from 'path';

const project = 'side-effects';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
            webpackOptions: {
                output: { path: join(projectDir, 'dist2') },
            },
        },
        before,
        afterEach,
        after
    );

    it('should include deep sheets with side effects', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);

        expect(styleElements).to.eql([
            { id: './src/native.css', depth: '0' },
            { id: './src/global-selector.st.css', depth: '1' },
            { id: './src/global-keyframes.st.css', depth: '1' },
            { id: './src/global-layer.st.css', depth: '1' },
            { id: './src/global-custom-property.st.css', depth: '1' },
            // { id: './src/no-side-effects-proxy.st.css', depth: '2' },
            { id: './src/index.st.css', depth: '3' },
        ]);
    });
});
