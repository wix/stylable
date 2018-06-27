// import { expect } from 'chai';
import { join } from 'path';
import { StylableProjectRunner } from 'stylable-build-test-kit';

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
