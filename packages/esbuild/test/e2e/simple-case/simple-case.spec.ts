import { expect } from 'chai';
import { ESBuildTestKit } from '../esbuild-testkit';
import type { Page, Response } from 'playwright-core';
import { sep } from 'node:path';

/**
 * This is the expected order of the stylesheets in the DOM
 * the file imported-only-from-css.st.css is not included because it is not imported from JS
 */
const stylesInOrder = [
    {
        st_id: 'reset.css|reset',
    },
    {
        st_id: 'side-effects.st.css|sideeffects',
    },
    {
        st_id: `internal-dir${sep}internal-dir.st.css|internaldir`,
    },
    {
        st_id: 'a.st.css|a',
    },
    {
        st_id: 'b.st.css|b',
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
            stylesInOrder,
            `"class extending component '.root => .b__root' in stylesheet 'b.st.css' was set on a node that does not extend '.root => .deep__root' from stylesheet 'deep.st.css'"`,
            'override-active'
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
            stylesInOrder.map(({ st_id }) => escapeRegExp(st_id.split('|')[0])).join('[\\s\\S]*?')
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
    unusedComponent: string
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
                    document.querySelector('.deep__root')!
                ).getPropertyValue('--unused-deep'),
            };
        });
        
    const assetLoaded = Boolean(responses?.find((r) => r.url().match(/asset-.*?\.png$/)));
    const internalDirAsset = Boolean(responses?.find((r) => r.url().match(/internal-dir-.*?\.png$/)));

    expect(internalDirAsset, 'asset loaded from internal dir').to.eql(true);
    expect(assetLoaded, 'asset loaded').to.eql(true);
    expect(reset, 'reset applied').to.eql('true');
    expect(sideEffects, 'side effects loaded').to.eql('true');
    expect(simpleOrderOverride, 'simple override').to.eql('rgb(0, 128, 0)');
    expect(styles, 'loaded stylesheets').to.eql(stylesheets);
    expect(devRule, 'dev rule applied').to.eql(devRuleMatch);
    expect(unusedComponentValue, 'unused component').to.eql(unusedComponent);
}
