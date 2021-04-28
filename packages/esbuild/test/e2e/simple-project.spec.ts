// import {} from '@stylable/e2e-test-kit'
import { dirname } from 'path';
import { inspect } from 'util';
import { expect } from 'chai';
import { build as esbuild, BuildOptions, BuildResult } from 'esbuild';

interface ProjectBuild {
    run: (
        build: typeof esbuild,
        o: (options: BuildOptions) => BuildOptions
    ) => Promise<BuildResult>;
}

class ESBuildTestKit {
    buildFile: string;
    buildResult!: BuildResult;
    constructor(public project: string) {
        this.buildFile = require.resolve(`@stylable/esbuild/test/e2e/${this.project}/build`);
    }
    async build() {
        const { run }: ProjectBuild = await import(this.buildFile);
        this.buildResult = await run(esbuild, (options: BuildOptions) => ({
            ...options,
            plugins: [...(options.plugins ?? [])],
            absWorkingDir: dirname(this.buildFile),
            metafile: true,
            outdir: './dist',
            platform: 'browser',
            format: 'esm',
            target: ['es2020', 'chrome58', 'firefox57', 'safari11', 'edge16', 'node12'],
            bundle: true,
        }));
        this.log('build done!');
    }
    log(...args: unknown[]) {
        console.log(`${this.project}`, ...args);
    }
    dispose() {
        /** */
    }
}

describe('', () => {
    let tk!: ESBuildTestKit;
    beforeEach(() => (tk = new ESBuildTestKit('simple-project')));
    afterEach(() => tk.dispose());

    it('', async () => {
        await tk.build();
        console.log(inspect(tk.buildResult.metafile, false, 10));
        expect(1);
    });
});
