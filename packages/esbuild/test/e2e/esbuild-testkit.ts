import { dirname } from 'path';
import { build as esbuild, BuildOptions, BuildResult } from 'esbuild';

interface ProjectBuild {
    run: (
        build: typeof esbuild,
        options: (options: BuildOptions) => BuildOptions
    ) => Promise<BuildResult>;
}

export class ESBuildTestKit {
    buildFile: string;
    buildResult!: BuildResult;
    constructor(public project: string) {
        this.buildFile = require.resolve(`@stylable/esbuild/test/e2e/${this.project}/build.js`);
    }
    async build() {
        const { run }: ProjectBuild = await import(this.buildFile);
        this.buildResult = await run(esbuild, (options: BuildOptions) => ({
            ...options,
            plugins: [...(options.plugins ?? [])],
            absWorkingDir: dirname(this.buildFile),
            loader: {
                '.png': 'file',
            },
            outdir: './dist',
            platform: 'browser',
            format: 'esm',
            target: ['es2020'],
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
