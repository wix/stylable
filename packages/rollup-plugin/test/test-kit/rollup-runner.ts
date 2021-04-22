import nodeResolve from '@rollup/plugin-node-resolve';
import { RollupWatcherEvent, watch } from 'rollup';
import { runServer } from '@stylable/e2e-test-kit';
import playwright from 'playwright-core';
import { stylableRollupPlugin, StylableRollupPluginOptions } from '@stylable/rollup-plugin';
import { createTempProject, actAndWaitForBuild, waitForWatcherFinish } from './test-helpers';
import { dirname, join } from 'path';
import html from '@rollup/plugin-html';

export interface RollupRunnerOptions {
    projectPath: string;
    nodeModulesPath?: string;
    entry?: string;
    pluginOptions?: StylableRollupPluginOptions;
}
const rootNodeModulesFromHere = join(
    dirname(require.resolve('../../../../../package.json')),
    'node_modules'
);
export function rollupRunner({
    projectPath,
    nodeModulesPath = rootNodeModulesFromHere,
    entry = 'index.js',
    pluginOptions,
}: RollupRunnerOptions) {
    const { context, projectDir, input, dispose: removeProject } = createTempProject(
        projectPath,
        nodeModulesPath,
        entry
    );

    const dist = context + '/dist';

    const watcher = watch({
        context,
        input,
        output: { dir: dist },
        watch: {
            buildDelay: 100,
            clearScreen: false,
            chokidar: { persistent: true },
        },
        plugins: [
            nodeResolve(),
            stylableRollupPlugin({
                inlineAssets: false,
                resolveNamespace(ns) {
                    return ns;
                },
                ...pluginOptions,
            }),
            html({}),
        ],
    });
    const ready = waitForWatcherFinish(watcher);

    const disposables: Array<() => Promise<void> | void> = [
        removeProject,
        () => {
            watcher.close();
        },
    ];

    async function dispose() {
        for (const dispose of disposables.reverse()) {
            await dispose();
        }
        disposables.length = 0;
    }

    after(() => dispose());

    return {
        context,
        projectDir,
        input,
        dist,
        watcher,
        async serve() {
            const { server, serverUrl } = await runServer(dist);
            disposables.push(() => server.close());
            return serverUrl;
        },
        async open(url: string, launchOptions?: playwright.LaunchOptions) {
            const browser = await playwright.chromium.launch(launchOptions);
            const browserContext = await browser.newContext();
            const page = await browserContext.newPage();

            await page.goto(url, { waitUntil: 'networkidle' });

            disposables.push(() => {
                return browser.close();
            });
            return page;
        },
        dispose,
        ready,
        async act(action: (done: Promise<RollupWatcherEvent>) => Promise<void> | void) {
            return await actAndWaitForBuild(watcher, action);
        },
    };
}
