import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { build as esbuild, BuildOptions, BuildResult } from 'esbuild';
import { runServer } from '@stylable/e2e-test-kit';
import playwright from 'playwright-core';

type BuildFn = (
    build: typeof esbuild,
    options: (options: BuildOptions) => BuildOptions
) => Promise<BuildResult>;

export class ESBuildTestKit {
    disposables: Array<() => void> = [];
    async build(project: string, buildExport?: string) {
        let openServerUrl: string | undefined;
        const buildFile = require.resolve(`@stylable/esbuild/test/e2e/${project}/build`);
        const cwd = dirname(buildFile);
        const moduleExports = await import(buildFile);
        const run = moduleExports[buildExport || 'run'] as BuildFn;
        if (!run) {
            throw new Error(`could not find ${buildExport || 'run'} export in ${buildFile}`);
        }
        const buildResult = await run(esbuild, (options: BuildOptions) => ({
            ...options,
            plugins: [...(options.plugins ?? [])],
            absWorkingDir: cwd,
            loader: {
                '.png': 'file',
            },
            outdir: './dist',
            platform: 'browser',
            format: 'esm',
            target: ['es2020'],
            bundle: true,
        }));
        console.log(project, 'Build done!');
        const serve = async () => {
            if (openServerUrl) return openServerUrl;
            const { server, serverUrl } = await runServer(cwd, 3000, (...args) =>
                console.log(project, ...args)
            );
            this.disposables.push(() => server.close());
            console.log(project, 'Served at ', serverUrl);
            return (openServerUrl = serverUrl);
        };
        const open = async (
            launchOptions?: playwright.LaunchOptions,
            pathname?: string,
            captureResponses?: boolean
        ) => {
            if (!openServerUrl) {
                await serve();
                if (!openServerUrl) {
                    throw new Error('failed to automatically serve project');
                }
            }
            const url = openServerUrl + (pathname ? '/' + pathname : '');
            const browser = process.env.PLAYWRIGHT_SERVER
                ? await playwright.chromium.connect(process.env.PLAYWRIGHT_SERVER, launchOptions)
                : await playwright.chromium.launch(launchOptions);

            const browserContext = await browser.newContext();
            const page = await browserContext.newPage();

            let responses: Array<playwright.Response> | undefined;
            if (captureResponses) {
                responses = [];
                page.on('response', (response) => responses!.push(response));
            }

            await page.goto(url, { waitUntil: captureResponses ? 'networkidle' : 'load' });

            this.disposables.push(() => {
                return browser.close();
            });
            return { page, responses };
        };
        return {
            result: buildResult,
            serve,
            open,
            read(pathInCwd: string) {
                return readFileSync(join(cwd, pathInCwd), 'utf8');
            },
        };
    }
    dispose() {
        for (const dispose of this.disposables) {
            dispose();
        }
    }
}
