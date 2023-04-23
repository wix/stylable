import { expect } from 'chai';
import { ESBuildTestKit } from '../esbuild-testkit';
import type { Page } from 'playwright-core';

describe('Stylable ESBuild plugin ', () => {
    let tk!: ESBuildTestKit;
    beforeEach(() => (tk = new ESBuildTestKit()));
    afterEach(() => tk.dispose());

    it('should build a project in dev mode', async () => {
        const { open } = await tk.build('simple-case', 'build.css-in-js.js');
        await contract(await open({ headless: false }), [
            {
                st_id: 'reset.css',
            },
            {
                st_id: 'a.st.css',
            },
            {
                st_id: 'side-effects.st.css',
            },
            {
                st_id: 'b.st.css',
            },
        ]);
    });

    it('should build a project in dev mode', async () => {
        const { open } = await tk.build('simple-case', 'build.css-bundle.js');
        await contract(await open({ headless: false }, 'index.bundle.html'), []);
    });
});

async function contract(page: Page, stylesheets: Array<Record<string, string>>) {
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

    expect(reset, 'reset applied').to.eql(' true');
    expect(sideEffects, 'side effects loaded').to.eql(' true');
    expect(bodyColor, 'simple override').to.eql('rgb(0, 128, 0)');
    expect(styles, 'loaded stylesheets').to.eql(stylesheets);
}
