import { expect } from 'chai';
import { join } from 'path';
import { browserFunctions, StylableProjectRunner } from 'stylable-build-test-kit';

const project = 'optimizations';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            port: 3002,
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

        expect(styleElements).to.eql([
            // {
            //     id: './node_modules/test-components/button.st.css',
            //     depth: '1',
            //     css: ''
            // },
            // {
            //     id: './node_modules/test-components/index.st.css',
            //     depth: '2',
            //     css: ''
            // },
            {
                id: './src/index.st.css',
                depth: '3',
                css: '.s0[data-o0-x]{font-family:MyFont}.s1{background:#00f}'
            }
        ]);
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const { fontFamily, backgroundColor, exports } = await page.evaluate(() => {
            return {
                backgroundColor: getComputedStyle(document.body).backgroundColor,
                fontFamily: getComputedStyle(document.documentElement).fontFamily,
                exports: Object.getPrototypeOf((window as any).stylableIndex)
            };
        });

        expect(exports.$namespace).to.eql('o0');
        expect(exports.myValue).to.eql('red');
        expect(exports.root).to.eql('s0');
        expect(exports.used).to.eql('s1');
        expect(exports.empty).to.eql('s2');

        expect(backgroundColor).to.eql('rgb(0, 0, 255)');
        expect(fontFamily).to.eql('MyFont');
    });
});
