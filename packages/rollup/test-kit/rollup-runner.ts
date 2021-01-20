import nodeResolve from 'rollup-plugin-node-resolve';
import { watch } from 'rollup';
import { serve } from '@stylable/e2e-test-kit';
import puppeteer from 'puppeteer';
import { stylableRollupPlugin } from '../src';
import { createTempProject, actAndWaitForBuild } from './test-helpers';
import { join } from 'path';
const html = require('@rollup/plugin-html');

export function rollupRunner({
    projectPath,
    nodeModulesPath = join(__dirname, '../../../node_modules'),
    entry = 'index.ts',
}: {
    projectPath: string;
    nodeModulesPath?: string;
    entry?: string;
}) {
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
            // skipWrite: true,
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
            }),
            html(),
        ],
    });

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
            const { server, serverUrl } = await serve(dist);
            disposables.push(() => server.close());
            return serverUrl;
        },
        async open(url: string) {
            const browser = await puppeteer.launch({ headless: false });
            const page = await browser.newPage();

            await page.setCacheEnabled(false);
            await page.goto(url, { waitUntil: 'networkidle0' });

            disposables.push(() => {
                return browser.close();
            });
            return page;
        },
        dispose,
        async bundle(action?: () => void) {
            const val = await actAndWaitForBuild(watcher, action);

            await val.result.write({
                dir: dist,
            });
        },
    };
}
