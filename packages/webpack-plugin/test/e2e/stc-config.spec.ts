import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'stc-config';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`),
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after,
    );

    it('run "stc" when the plugin finds stylable config file with "stc" options', () => {
        const files = projectRunner.getProjectFiles();

        expect(Object.keys(files)).to.contain.members([
            'dist/main.js', // webpack output
            'dist/index.st.css', // stc output
        ]);
    });
});
