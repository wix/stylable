import { expect } from 'chai';
import { rollupRunner } from './test-kit/rollup-runner';
import { getProjectPath } from './test-kit/test-helpers';

describe('StylableRollupPlugin - tree-shake', function () {
    this.timeout(30000);

    const project = 'tree-shake';

    const runner = rollupRunner({
        projectPath: getProjectPath(project),
        entry: './index.js',
        pluginOptions: {
            stylableConfig(config) {
                config.mode = 'production';
                // keep namespace with no hash for test expectations
                config.resolveNamespace = (namespace) => namespace;
                return config;
            },
            includeGlobalSideEffects: true,
        },
        rollupOptions: {
            treeshake: 'smallest',
        },
    });

    it('should not include unused js', async () => {
        const { ready, getOutputFiles } = runner;

        await ready;
        const outputFiles = getOutputFiles();
        const bundledJS = outputFiles['index.js'];

        expect(bundledJS, 'keyframes').to.not.include('keyframesX');
        expect(bundledJS, 'stVars').to.not.include('varX');
        expect(bundledJS, 'vars').to.not.include('propX');
        expect(bundledJS, 'layers').to.not.include('layerX');
        expect(bundledJS, 'containers').to.not.include('containerX');
    });
});
