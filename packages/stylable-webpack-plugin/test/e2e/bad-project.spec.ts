import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'bad-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            port: 3001,
            throwOnBuildError: false,
            puppeteerOptions: {
                // headless: false
            }
        },
        before,
        afterEach,
        after
    );

    it('reports warnings', async () => {
        const warnings = projectRunner.getBuildWarningMessages();
        const expected = [/Could not resolve 'unknown'/, /unknown var "xxx"/];
        expect(warnings.length).to.equal(2);
        warnings.forEach((warning: string, i: number) => {
            expect(warning).to.match(expected[i]);
        });
    });
});
