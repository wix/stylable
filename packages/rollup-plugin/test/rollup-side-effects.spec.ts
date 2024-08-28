import { expect } from 'chai';
import { rollupRunner } from './test-kit/rollup-runner';
import { getProjectPath } from './test-kit/test-helpers';
import { deindent } from '@stylable/core-test-kit';

describe('StylableRollupPlugin - include all stylesheets with side-effects', function () {
    this.timeout(30000);

    const project = 'side-effects';

    const runner = rollupRunner({
        projectPath: getProjectPath(project),
        entry: './src/index.js',
        pluginOptions: {
            stylableConfig(config) {
                config.mode = 'development';
                // keep namespace with no hash for test expectations
                config.resolveNamespace = (namespace) => namespace;
                return config;
            },
            includeGlobalSideEffects: true,
        },
    });

    it('should include native CSS imports', async () => {
        const { ready, getOutputFiles } = runner;

        await ready;

        const expected = deindent(`
        .native-css {
            color: green;
        }
        
        @property --globalCustomProp {
            syntax: '<color>';
            initial-value: green;
            inherits: false;
        }
        
        @keyframes globalKeys {}
        
        @layer globalLayer;
        
        html {
            --global-selector-x: green;
        }
        .index__root {}
        `);
        const outputFiles = getOutputFiles();
        expect(outputFiles['stylable.css'].replace(/\s+/g, ''), 'css bundle').to.eql(
            expected.replace(/\s+/g, ''),
        );
    });
});
