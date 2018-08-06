import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'dev-mode-warnings-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            port: 3001,
            puppeteerOptions: {
                // headless: false
            }
        },
        before,
        afterEach,
        after
    );

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const values = await page.evaluate(() => {
            const computedStyle = getComputedStyle(document.body, '::before');
            return {
                color: computedStyle.backgroundColor,
                content: computedStyle.content
            };
        });

        expect(values.color).to.eql('rgb(255, 0, 0)');
        // tslint:disable-next-line:max-line-length
        expect(values.content).to.eql(`"class extending component '.root => o0--root' in stylesheet 'index.st.css' was set on a node that does not extend '.root => o1--root' from stylesheet 'other.st.css'"`);
    });
});
