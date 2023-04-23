import { expect } from 'chai';
import { ESBuildTestKit } from '../esbuild-testkit';
import type { Page, Response } from 'playwright-core';

describe('Stylable ESBuild plugin ', () => {
    const tk = new ESBuildTestKit();
    after(() => tk.dispose());

    it('should build a project in dev mode', async () => {
        const { open } = await tk.build('simple-case', 'build.css-in-js.js');
        await contract(await open({ headless: true }, 'index.html', true), [
            {
                st_id: 'a.st.css|a',
            },
            {
                st_id: 'reset.css|reset',
            },
            {
                st_id: 'side-effects.st.css|sideeffects',
            },
            {
                st_id: 'b.st.css|b',
            },
        ]);
    });

    it('should build a project in dev mode', async () => {
        const { open } = await tk.build('simple-case', 'build.css-bundle.js');
        await contract(await open({ headless: true }, 'index.bundle.html', true), []);
    });
});

async function contract(
    { page, responses }: { page: Page; responses?: Array<Response> },
    stylesheets: Array<Record<string, string>>
) {
    const { reset, sideEffects, bodyColor, styles } = await page.evaluate(() => {
        return {
            styles: Array.from(document.querySelectorAll('[st_id]')).map((el) => {
                return {
                    st_id: el.getAttribute('st_id'),
                };
            }),
            bodyColor: getComputedStyle(document.body).color,
            sideEffects: getComputedStyle(document.body).getPropertyValue('--side-effects'),
            reset: getComputedStyle(document.body).getPropertyValue('--reset'),
        };
    });

    const assetLoaded = Boolean(responses?.find((r) => r.url().match(/asset.*?\.png$/)));

    expect(assetLoaded, 'asset loaded').to.eql(true);
    expect(reset, 'reset applied').to.eql(' true');
    expect(sideEffects, 'side effects loaded').to.eql(' true');
    expect(bodyColor, 'simple override').to.eql('rgb(0, 128, 0)');
    expect(styles, 'loaded stylesheets').to.eql(stylesheets);
}
