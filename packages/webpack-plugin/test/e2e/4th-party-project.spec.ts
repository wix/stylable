import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { dirname } from 'path';

const project = '4th-party-project';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`),
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false,
                // devtools: true
            },
        },
        before,
        afterEach,
        after,
    );

    it('renders css', async () => {
        await projectRunner.openInBrowser();
        // TODO: add expect
    });
});
