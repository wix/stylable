import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'errors-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            throwOnBuildError: false,
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after
    );

    it('emit stylable errors/warnings as webpack errors/warnings', () => {
        const errors = projectRunner.getBuildErrorMessages();
        const warnings = projectRunner.getBuildWarningMessages();
        expect(errors.length, 'should only have one error').to.equal(1);
        expect(errors[0]).to.match(/cannot extend unknown symbol "NotFound"/);
        expect(warnings.length, 'should only have two warnings').to.equal(2);
        expect(warnings[1]).to.match(/unknown pseudo-state "unknown-state"/);
    });
});
