import nodeResolve from 'rollup-plugin-node-resolve';
import { join } from 'path';
import { nodeFs } from '@file-services/node';
import { watch } from 'rollup';

import { stylableRollupPlugin } from '../src';
import { createTempProject, actAndWaitForBuild, findModuleByName } from './test-helpers';
import { expect } from 'chai';

describe('StylableRollupPlugin', () => {
    const { context, input } = createTempProject(
        join(__dirname, `projects/simple-stylable`),
        join(__dirname, '../../../node_modules'),
        'index.ts'
    );

    it('should', async () => {
        const watcher = watch({
            context,
            input,
            // output: {dir: 'dist'},
            watch: {
                skipWrite: true,
                buildDelay: 100,
                clearScreen: false,
                chokidar: { persistent: true },
            },
            plugins: [nodeResolve(), stylableRollupPlugin({ inlineAssets: false })],
        });

        const val = await actAndWaitForBuild(watcher);
        const bundle = await val.result.generate({});

        const importedStCSS = findModuleByName('imported.st.css', val.result, bundle.output[0]);
        const indexStCSS = findModuleByName('index.st.css', val.result, bundle.output[0]);

        expect(importedStCSS.code).to.match(/imported\d+/);
        expect(indexStCSS.code).to.match(/imported\d+/);

        const val2 = await actAndWaitForBuild(watcher, () => {
            nodeFs.writeFileSync(
                importedStCSS.id,
                '@namespace "TEST";\n' + importedStCSS.originalCode
            );
        });
        const bundle2 = await val2.result.generate({});

        const importedStCSS2 = findModuleByName('imported.st.css', val2.result, bundle2.output[0]);
        const indexStCSS2 = findModuleByName('index.st.css', val2.result, bundle2.output[0]);

        expect(importedStCSS2.code).to.not.match(/imported\d+/);
        expect(indexStCSS2.code).to.not.match(/imported\d+/);
        expect(importedStCSS2.code).to.match(/TEST\d+/);
        expect(indexStCSS2.code).to.match(/TEST\d+/);

        watcher.close();

        // const res = await rollup({
        //     context,
        //     input,
        //     watch: {
        //         skipWrite: true,
        //         buildDelay: 10,
        //         clearScreen: false,
        //         chokidar: { persistent: false },
        //     },
        //     plugins: [nodeResolve(), stylableRollupPlugin()],
        // });
    });
});
