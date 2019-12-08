import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'raw-project';

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

    it('loading is working for raw-loader', async () => {
        const { page } = await projectRunner.openInBrowser();
        const text = await page.evaluate(() => {
            return {
                css: (window as any).css,
                index: (window as any).index
            };
        });
        expect(text.index).to.match(/\/\* CONTENT \*\//);
        expect(text.css).to.equal('data:text/css;base64,LyogQ09OVEVOVCAqLw==');
        expect(projectRunner.getBuildWarningMessages()[0]).to.match(
            /Loading a Stylable stylesheet via webpack loaders is not supported and may cause runtime errors\.\n".*?" in ".*?"/
        );
    });
});
