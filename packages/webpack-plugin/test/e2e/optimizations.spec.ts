import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'optimizations';

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
                css: '.s0.o0__x{font-family:MyFont}.s1{background:#00f}'
            }
        ]);
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        const { fontFamily, backgroundColor, classes, stVars, $namespace } = await page.evaluate(() => {
            return {
                backgroundColor: getComputedStyle(document.body).backgroundColor,
                fontFamily: getComputedStyle(document.documentElement!).fontFamily,
                classes: (window as any).stylableClasses,
                $namespace: (window as any).$namespace,
                stVars: (window as any).stVars
            };
        });

        expect($namespace).to.eql('o0');
        expect(stVars.myValue).to.eql('red');
        expect(classes.root).to.eql('s0');
        expect(classes.used).to.eql('s1');
        expect(classes.empty).to.eql('s2');

        expect(backgroundColor).to.eql('rgb(0, 0, 255)');
        expect(fontFamily).to.eql('MyFont');
    });
});
