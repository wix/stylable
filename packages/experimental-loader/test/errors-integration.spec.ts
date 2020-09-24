import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'errors-integration';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            throwOnBuildError: false,
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
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
