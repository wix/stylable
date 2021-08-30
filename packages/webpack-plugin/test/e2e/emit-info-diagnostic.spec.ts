import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'emit-info-diagnostic';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            throwOnBuildError: false,
            projectDir,
            launchOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after
    );

    it('emit stylable info diagnostic', () => {
        const errors = projectRunner.getBuildErrorMessages();
        const warnings = projectRunner.getBuildWarningMessages();

        expect(warnings).to.have.length(1);
        expect(warnings[0]).to.match(/"stArray" is deprecated, use "st-array"/);
        expect(errors).to.deep.equal([]);
    });
});
