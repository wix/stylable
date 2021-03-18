import { dirname, join } from 'path';
import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { sleep } from 'promise-assist';

const project = 'hd-cache';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                headless: false,
            },
        },
        before,
        afterEach,
        after,
        true,
        join(projectDir, '../xxx')
    );
    it('renders css', async () => {
        await projectRunner.openInBrowser();
        console.log(projectRunner.projectDir);
        await sleep(9999999);
    });
});
