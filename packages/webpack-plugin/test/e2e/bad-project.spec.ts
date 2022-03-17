import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'bad-project';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            throwOnBuildError: false,
            launchOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after
    );

    it('reports warnings', () => {
        // TESTING FAILURE
        expect(1).to.eql(2);

        const warnings = projectRunner.getBuildWarningMessages();
        // const expected = [/could not resolve "unknown"/, /unknown var "xxx"/];

        const expected = [
            /cannot extend unknown symbol "unknown"/,
            /cannot resolve imported symbol "unknown" from stylesheet "\.\/comp\.st\.css"/,
            /unknown var "xxx"/,
        ];
        expect(warnings.length).to.equal(3);
        warnings.forEach((warning, i: number) => {
            expect(warning).to.match(expected[i]);
        });
    });
});
