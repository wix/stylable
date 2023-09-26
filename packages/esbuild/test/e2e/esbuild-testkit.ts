import { dirname, join } from 'node:path';
import { readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import fs from '@file-services/node';
import { BuildContext, BuildOptions, context } from 'esbuild';
import { createTempDirectorySync, runServer } from '@stylable/e2e-test-kit';

import playwright from 'playwright-core';

type BuildFn = (
    build: typeof context,
    options: (options: BuildOptions) => BuildOptions
) => Promise<BuildContext>;

export class ESBuildTestKit {
    disposables: Array<() => void | Promise<void>> = [];
    constructor(
        private options: { log?: boolean; launchOptions?: playwright.LaunchOptions } = {}
    ) {}
    async build({
        project,
        buildExport,
        tmp = true,
        overrideOptions = {},
    }: {
        project: string;
        buildExport?: string;
        tmp?: boolean;
        overrideOptions?: BuildOptions;
    }) {
        let openServerUrl: string | undefined;
        let buildFile = require.resolve(`@stylable/esbuild/test/e2e/${project}/build.js`);
        let projectDir = dirname(buildFile);

        if (tmp) {
            const t = createTempDirectorySync('esbuild-testkit');
            this.disposables.push(() => t.remove());
            fs.copyDirectorySync(projectDir, t.path);
            buildFile = join(t.path, 'build.js');
            projectDir = t.path;

            symlinkSync(
                join(__dirname, '../../../../../node_modules'),
                join(t.path, 'node_modules'),
                'junction'
            );
            this.options.log &&
                console.log(`created temp project ${projectDir} and linked node_modules`);
        }
        const moduleExports = await import(buildFile);
        const run = moduleExports[buildExport || 'run'] as BuildFn;
        if (!run) {
            throw new Error(`could not find ${buildExport || 'run'} export in ${buildFile}`);
        }

        const buildContext = await run(context, (options: BuildOptions) => ({
            ...options,
            plugins: [...(options.plugins ?? [])],
            absWorkingDir: projectDir,
            loader: {
                '.png': 'file',
            },
            outdir: './dist',
            platform: 'browser',
            format: 'esm',
            target: ['es2020'],
            bundle: true,
            ...overrideOptions,
        }));
        this.disposables.push(() => buildContext.dispose());

        await buildContext.rebuild();

        this.options.log && console.log(project, 'Build done!');
        const serve = async () => {
            if (openServerUrl) return openServerUrl;
            const { server, serverUrl } = await runServer(
                projectDir,
                3000,
                (...args) => this.options.log && console.log(project, ...args)
            );
            this.disposables.push(() => server.close());
            this.options.log && console.log(project, 'Served at ', serverUrl);
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
                ? await playwright.chromium.connect(process.env.PLAYWRIGHT_SERVER, {
                      ...this.options.launchOptions,
                      ...launchOptions,
                  })
                : await playwright.chromium.launch({
                      ...this.options.launchOptions,
                      ...launchOptions,
                  });

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
            context: buildContext,
            serve,
            open,
            write(pathInCwd: string, content: string) {
                writeFileSync(join(projectDir, pathInCwd), content, 'utf8');
            },
            read(pathInCwd: string) {
                return readFileSync(join(projectDir, pathInCwd), 'utf8');
            },
        };
    }
    async dispose() {
        for (const dispose of this.disposables) {
            await dispose();
        }
        this.disposables.length = 0;
    }
}
