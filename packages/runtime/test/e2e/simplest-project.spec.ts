import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'simplest-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                // headless: false
            }
        },
        before,
        afterEach,
        after
    );

    it('css runtime variable overrides', async () => {
        const { page } = await projectRunner.openInBrowser();
        const { backgroundColor, borderColor, color } = await page.evaluate(() => {
            const computedStyle = getComputedStyle(document.documentElement!);

            return {
                backgroundColor: computedStyle.backgroundColor,
                color: computedStyle.backgroundColor,
                borderColor: computedStyle.borderColor
            };
        });

        expect(color).to.eql('rgb(0, 0, 255)');
        expect(backgroundColor).to.eql('rgb(0, 0, 255)');
        expect(borderColor).to.eql('rgb(255, 0, 0)');
    });
});
