import { dirname } from 'path';
import { expect } from 'chai';
import type { UserConfig as ViteConfig } from 'vite';
import { createServer } from 'vite';
import { viteStylable } from '@stylable/vite-plugin';
import playwright from 'playwright-core';

const project = 'vite-app';
const projectDir = dirname(
    require.resolve(`@stylable/vite-plugin/test/fixtures/${project}/index.html`)
);

const viteConfig: ViteConfig = {
    root: projectDir,
    plugins: [viteStylable()],
    logLevel: 'silent',
    clearScreen: false,
};

async function viteDev() {
    const viteServer = await createServer({
        configFile: false,
        ...viteConfig,
    });
    await viteServer.listen();
    const viteAddress = viteServer.httpServer?.address();

    if (!viteAddress) {
        throw new Error('no dev server url for some reason');
    }
    const url =
        typeof viteAddress === 'string' ? viteAddress : `http://localhost:${viteAddress.port}/`;

    return {
        async stop() {
            await viteServer.close();
        },
        url,
    };
}

describe('vite dev', () => {
    let viteDevServer: Awaited<ReturnType<typeof viteDev>> | undefined;
    const disposable = new Set<() => Promise<void> | void>();
    before(async () => {
        viteDevServer = await viteDev();
    });

    after(async () => {
        for (const dispose of disposable) {
            await dispose();
        }
        await viteDevServer?.stop();
    });

    it('should render stylable-styled content in `vite dev`', async () => {
        const page = await open(viteDevServer!.url, disposable);

        const bg = await page.evaluate(() => {
            const elm = document.querySelector('[data-hook="target"]')!;
            return window.getComputedStyle(elm).getPropertyValue('background-color');
        });

        expect(bg).to.equal('rgb(19, 55, 175)');
    });
});

async function open(url: string, dispose: Set<() => Promise<void> | void>) {
    const launchOptions = {};
    const browser = process.env.PLAYWRIGHT_SERVER
        ? await playwright.chromium.connect(process.env.PLAYWRIGHT_SERVER, launchOptions)
        : await playwright.chromium.launch(launchOptions);

    const browserContext = await browser.newContext();
    const page = await browserContext.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    dispose.add(() => browser.close());
    return page;
}
