import fs from '@file-services/node';
import { expect } from 'chai';
import { rollupRunner } from './test-kit/rollup-runner';
import { getProjectPath } from './test-kit/test-helpers';

describe('StylableRollupPlugin', function () {
    this.timeout(30000);

    const project = 'stc-config';

    const runner = rollupRunner({
        projectPath: getProjectPath(project),
        entry: './src/index.js',
        pluginOptions: {
            stcConfig: './project/stylable.config.js',
        },
    });

    it('run "stc" when the plugin finds stylable config file with "stc" options', async () => {
        await runner.ready;

        expect(Object.keys(runner.getOutputFiles()), 'initial build ran "stc"').to.contain.members([
            'index.st.css', // stc output
        ]);
    });

    it('should recovers in watch mode when broken "stc" source file is invalid', async () => {
        await runner.ready;

        const indexFilePath = fs.join(runner.projectDir, 'src', 'index.st.css');

        // Simulate error by using value function without a symbol.
        await runner.act(() => fs.promises.writeFile(indexFilePath, '.root { color: value(); }'), {
            strict: false,
        });

        // Revert error to normal.
        await runner.act(() => fs.promises.writeFile(indexFilePath, '.root {color: green;}'));

        const outputFiles = runner.getOutputFiles();
        expect(outputFiles['index.st.css'], '"stc" watch has been triggered').to.eql(
            '.root {color: green;}',
        );
    });
});
