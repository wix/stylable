import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'autoprefixer-project';

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

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata, true);

        // tslint:disable:max-line-length
        expect(styleElements).to.eql([{ id: './src/index.st.css', depth: '1',
            css: '::-webkit-input-placeholder {\n  color: gray;\n}\n:-ms-input-placeholder {\n  color: gray;\n}\n::-ms-input-placeholder {\n  color: gray;\n}\n::placeholder {\n  color: gray;\n}'
        }]);
        // tslint:enable:max-line-length
    });
});
