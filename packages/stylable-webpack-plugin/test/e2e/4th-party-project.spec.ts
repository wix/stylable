// import { expect } from 'chai';
import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { join } from 'path';

const project = '4th-party-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            port: 3001,
            puppeteerOptions: {
                // headless: false,
                // devtools: true
            }
        },
        before,
        afterEach,
        after
    );

    it('renders css', async () => {
        await projectRunner.openInBrowser();
        // TODO: add expect
    });
});
