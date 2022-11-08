import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname, join } from 'path';

const project = 'duplicate-namespace';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project}) css asset`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false,
            },
            throwOnBuildError: false,
            webpackOptions: {
                output: { path: join(projectDir, 'dist2') },
            },
            configName: 'webpack.config.css-output',
        },
        before,
        afterEach,
        after
    );

    it('should report detailed path of duplicate namespaced files', () => {
        const errors = projectRunner.getBuildErrorMessages();
        expect(errors.length).to.equal(1);
        const { message } = errors[0];
        expect(message).to.includes('Duplicate namespace');
        expect(message).to.includes('./src/index.js\n  ./src/index.st.css <-- Duplicate');
        expect(message).to.includes('./src/index.js\n  ./src/same-index.st.css <-- Duplicate');
    });

    it('should only load one copy of duplicated module with same content and depth ', async () => {
        const { page } = await projectRunner.openInBrowser({ captureResponses: true });

        const { rulesLength, stylesLength } = await page.evaluate(() => {
            const stylesLength = document.styleSheets.length;
            const rulesLength = document.styleSheets[0].cssRules.length;
            return {
                stylesLength,
                rulesLength,
            };
        });

        expect(stylesLength, 'only stylable.css should exist').to.equal(1);
        expect(rulesLength, 'sheet has 3 rules (one is omitted because duplication)').to.equal(3);
    });
});
