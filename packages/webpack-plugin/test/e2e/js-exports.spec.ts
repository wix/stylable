import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'js-exports';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`),
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after,
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const jsModule = await page.evaluate(() => (window as any).indexStylesheet);

        expect(jsModule).to.eql({
            classes: { root: 'index__root', part: 'index__part' },
            stVars: { V1: 'green', V2: 'blue' },
            vars: { P1: '--index-P1', P2: '--index-P2' },
            keyframes: { K1: 'index__K1', K2: 'index__K2' },
            layers: { L1: 'index__L1', L2: 'index__L2' },
            containers: { C1: 'index__C1', C2: 'index__C2' },
            namespace: 'index',
            // non serializable
            st: undefined,
            style: undefined,
            cssStates: undefined,
        });
    });
});
