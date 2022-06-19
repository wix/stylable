import { expect } from 'chai';
import { rollupRunner } from './test-kit/rollup-runner';
import { getProjectPath } from './test-kit/test-helpers';

describe('StylableRollupPlugin - js exports', function () {
    this.timeout(30000);

    const project = 'js-exports';

    const runner = rollupRunner({
        projectPath: getProjectPath(project),
        entry: './src/index.js',
        pluginOptions: {
            stcConfig: './project/stylable.config.js',
            // keep namespace with no hash for test expectations
            resolveNamespace: (namespace) => namespace,
        },
    });

    it('should export definitions to JS', async () => {
        const { serve, ready, open } = runner;

        await ready;

        const url = await serve();
        const page = await open(url);

        const jsModule = await page.evaluate(() => (window as any).indexStylesheet);

        expect(jsModule).to.eql({
            classes: { root: 'index__root', part: 'index__part' },
            stVars: { V1: 'green', V2: 'blue' },
            vars: { P1: '--index-P1', P2: '--index-P2' },
            keyframes: { K1: 'index__K1', K2: 'index__K2' },
            layers: { L1: 'index__L1', L2: 'index__L2' },
            namespace: 'index',
            // non serializable
            st: undefined,
            style: undefined,
            cssStates: undefined,
        });
    });
});
