import { expect } from 'chai';
import { join } from 'path';
import { StylableProjectRunner } from 'stylable-build-test-kit';

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
        expect(values.content).to.eql(`"Invalid CSS class assignment of '.o0--root', target node is missing extended class '.o1--root'"`);
    });
});
