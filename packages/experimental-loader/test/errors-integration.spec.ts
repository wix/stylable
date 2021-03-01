import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'errors-integration';
const projectDir = dirname(
    require.resolve(`@stylable/experimental-loader/test/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            throwOnBuildError: false,
            projectDir,
            launchOptions: {
                // headless: false,
            },
        },
        before,
        afterEach,
        after
    );

    it('emit errors and warnings from loader', () => {
        const errors = projectRunner.getBuildErrorMessagesDeep();
        const warnings = projectRunner.getBuildWarningsMessagesDeep();
        expect(errors[0].message).to.include(`"-st-from" cannot be empty`);
        expect(warnings[0].message).to.include(`cannot resolve '-st-extends' type for 'Unknown'`);
    });
});
