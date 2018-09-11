import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'css-deps-project';

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

    it.only('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const style = await page.evaluate(() => {
            return {
                cssDeps: (window as any).style.$cssDeps,
                id: (window as any).style.$id
            }
        });

        expect(style.cssDeps).to.eql([{ id: './src/index.st.css', depth: '1' }]);
    });
});
