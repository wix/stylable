import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'bad-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            throwOnBuildError: false,
            puppeteerOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after
    );

    it('reports warnings', () => {
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
