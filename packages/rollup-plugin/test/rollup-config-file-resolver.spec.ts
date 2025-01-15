import { expect } from 'chai';
import { rollupRunner } from './test-kit/rollup-runner.js';
import { getProjectPath } from './test-kit/test-helpers.js';

const getColor = () => getComputedStyle(document.body).color;

describe('StylableRollupPlugin', function () {
    this.timeout(20000);

    const project = 'config-file-resolver-override';

    const runner = rollupRunner({
        projectPath: getProjectPath(project),
        entry: './src/index.js',
        pluginOptions: {
            stcConfig: './project/stylable.config.js',
        },
    });

    it('should transform Stylable files with assets and create output css', async () => {
        const { serve, ready, open } = runner;

        await ready;
        const url = await serve();
        const page = await open(url);

        const locator = page.locator('body');

        const color = await locator.evaluateHandle(getColor);

        expect(color.toString()).to.equal('rgb(0, 128, 0)');
    });
});
