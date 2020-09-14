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
        expect(errors, 'should only have one error').to.have.lengthOf(1);
        expect(errors[0]).to.match(/cannot extend unknown symbol "NotFound"/);
        expect(warnings, 'should only have two warnings').to.have.lengthOf(2);
        expect(warnings[1]).to.match(/unknown pseudo-state "unknown-state"/);
    });
});
