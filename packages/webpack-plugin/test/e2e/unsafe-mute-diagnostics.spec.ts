import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'unsafe-mute-diagnostics';

describe(`(${project})`, () => {
    const projectRunner = new StylableProjectRunner({
        projectDir: join(__dirname, 'projects', project),
        port: 3001,
        puppeteerOptions: {},
        throwOnBuildError: false
    });

    it('should build a project with no errors (duplicate namespace) when muted', async () => {
        await projectRunner.bundle();
        expect(projectRunner.getBuildErrorMessages().length).to.equal(0);
    });
});
