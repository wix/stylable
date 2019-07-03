import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'optimization-3rd-party-resolutions';

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

    it('namespaces are created in a determanistic way', async () => {
        const { page } = await projectRunner.openInBrowser();

        const { namespaces } = await page.evaluate(() => {
            return {
                namespaces: (window as any).namespaces
            };
        });

        console.log(namespaces);

        expect(namespaces).to.eql({
            localNamespace: 'o0',
            button1NS: 'o1',
            button2NS: 'o2',
            button3NS: 'o3',
            button4NS: 'o4',
            button5NS: 'o5',
            button6NS: 'o6'
        });
    });
});
