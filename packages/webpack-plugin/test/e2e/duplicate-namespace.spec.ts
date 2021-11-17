import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'duplicate-namespace';
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
            throwOnBuildError: false,
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
        expect(message).to.includes(
            './src/index.js\n  ./src/index.st.css <-- Duplicate'
        );
        expect(message).to.includes(
            './src/index.js\n  ./src/same-index.st.css <-- Duplicate'
        );
    });
});
