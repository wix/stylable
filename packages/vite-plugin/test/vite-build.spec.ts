import { dirname } from 'path';
import { expect } from 'chai';
import { type UserConfig as ViteConfig, build, preview } from 'vite';
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

async function viteBuildAndPreview() {
    await build({
        configFile: false,
        ...viteConfig,
    });
    const vitePreviewServer = await preview({
        configFile: false,
        ...viteConfig,
    });

    const viteAddress = vitePreviewServer.httpServer?.address();

    if (!viteAddress) {
        throw new Error('no preview server url for some reason');
    }
    const url =
        typeof viteAddress === 'string' ? viteAddress : `http://localhost:${viteAddress.port}/`;

    return {
        stop() {
            vitePreviewServer.httpServer.close();
            return Promise.resolve();
        },
        url,
    };
}

describe('vite build', () => {
    let vitePreviewServer: Awaited<ReturnType<typeof viteBuildAndPreview>> | undefined;
    const disposable = new Set<() => Promise<void> | void>();
    before(async () => {
        vitePreviewServer = await viteBuildAndPreview();
    });

    after(async () => {
        for (const dispose of disposable) {
            await dispose();
        }
        await vitePreviewServer?.stop();
    });

    it('should render stylable-styled content in `vite build && vite preview`', async () => {
        const page = await open(vitePreviewServer!.url, disposable);

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
