import { expect } from 'chai';
import { ESBuildTestKit } from '../esbuild-testkit.js';
import type { Page, Response } from 'playwright-core';
import { sep } from 'node:path';

/**
 * This is the expected order of the stylesheets in the DOM
 * the file imported-only-from-css.st.css is not included because it is not imported from JS
 */
const stylesInOrder = [
    {
        path: 'reset.css',
        fileName: 'reset.css',
        namespace: 'reset',
    },
    {
        path: 'side-effects.st.css',
        fileName: 'side-effects.st.css',
        namespace: 'side-effects',
    },
    {
        path: `internal-dir${sep}internal-dir.st.css`,
        fileName: 'internal-dir.st.css',
        namespace: 'internal-dir',
    },
    {
        path: 'a.st.css',
        fileName: 'a.st.css',
        namespace: 'a',
    },
    {
        path: 'b.st.css',
        fileName: 'b.st.css',
        namespace: 'b',
    },
];

describe('Stylable ESBuild plugin', () => {
    const tk = new ESBuildTestKit({
        log: false,
        launchOptions: {
            headless: true,
        },
    });
    afterEach(() => tk.dispose());

    it('should build a project in dev mode', async () => {
        const { open } = await tk.build({ project: 'simple-case', buildExport: 'cssInJsDev' });
        await contract(
            await open({}, 'index.html', true),
            stylesInOrder.map(({ path, namespace }) => ({ st_id: `${path}|${namespace}` })),
            `"class extending component '.root => .b__root' in stylesheet 'b.st.css' was set on a node that does not extend '.root => .deep__root' from stylesheet 'deep.st.css'"`,
            'override-active',
        );
    });

    it('should build a project with a bundle', async () => {
        const { open, read } = await tk.build({
            project: 'simple-case',
            buildExport: 'cssBundleProd',
        });
        await contract(await open({}, 'index.bundle.html', true), [], 'none', 'override-removed');
        const css = read('dist-bundle/index.css');

        const matchOrder = new RegExp(
            stylesInOrder.map(({ fileName }) => escapeRegExp(fileName)).join('[\\s\\S]*?'),
        );

        expect(css).to.match(matchOrder);
    });

    it('should build a project with a bundle (minify)', async () => {
        const { open, read } = await tk.build({
            project: 'simple-case',
            buildExport: 'cssBundleProd',
            overrideOptions: {
                minify: true,
            },
        });
        await contract(await open({}, 'index.bundle.html', true), [], 'none', 'override-removed');

        const css = read('dist-bundle/index.css');

        const matchOrder = new RegExp(
            stylesInOrder.map(({ fileName }) => escapeRegExp(fileName)).join('[\\s\\S]*?'),
        );
        expect(css).to.match(matchOrder);
    });
});

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function contract(
    { page, responses }: { page: Page; responses?: Array<Response> },
    stylesheets: Array<Record<string, string>>,
    devRuleMatch: string,
    unusedComponent: string,
) {
    const { unusedComponentValue, reset, sideEffects, simpleOrderOverride, styles, devRule } =
        await page.evaluate(() => {
            return {
                devRule: window.getComputedStyle(document.body, '::before').content,
                styles: Array.from(document.querySelectorAll('[st_id]')).map((el) => {
                    return {
                        st_id: el.getAttribute('st_id'),
                    };
                }),
                simpleOrderOverride: getComputedStyle(document.body).color,
                sideEffects: getComputedStyle(document.body).getPropertyValue('--side-effects'),
                reset: getComputedStyle(document.body).getPropertyValue('--reset'),
                unusedComponentValue: getComputedStyle(
                    document.querySelector('.deep__root')!,
                ).getPropertyValue('--unused-deep'),
            };
        });

    const assetLoaded = Boolean(responses?.find((r) => r.url().match(/asset-.*?\.png$/)));
    const internalDirAsset = Boolean(
        responses?.find((r) => r.url().match(/internal-dir-.*?\.png$/)),
    );

    expect(internalDirAsset, 'asset loaded from internal dir').to.eql(true);
    expect(assetLoaded, 'asset loaded').to.eql(true);
    expect(reset, 'reset applied').to.eql('true');
    expect(sideEffects, 'side effects loaded').to.eql('true');
    expect(simpleOrderOverride, 'simple override').to.eql('rgb(0, 128, 0)');
    expect(styles, 'loaded stylesheets').to.eql(stylesheets);
    expect(devRule, 'dev rule applied').to.eql(devRuleMatch);
    expect(unusedComponentValue, 'unused component').to.eql(unusedComponent);
}
