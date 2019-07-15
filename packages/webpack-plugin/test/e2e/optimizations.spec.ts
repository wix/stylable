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
                // tslint:disable-next-line: max-line-length
                css: '.global1{background:gray}.global1 .global2{background-color:#e4e4e4}.s0.o0--x{font-family:MyFont}.s1{background:#00f}'
            }
        ]);
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();
        // tslint:disable-next-line: max-line-length
        const { fontFamily, backgroundColor, classes, stVars, namespace, global1ClassColor, global2ClassColor } = await page.evaluate(() => {
            return {
                backgroundColor: getComputedStyle(document.body).backgroundColor,
                fontFamily: getComputedStyle(document.documentElement!).fontFamily,
                classes: (window as any).stylableClasses,
                namespace: (window as any).namespace,
                stVars: (window as any).stVars,
                global1ClassColor: getComputedStyle(document.querySelector('.global1')!).backgroundColor,
                global2ClassColor: getComputedStyle(document.querySelector('.global2')!).backgroundColor
            };
        });

        expect(namespace).to.eql('o0');
        expect(stVars.myValue).to.eql('red');
        expect(classes.root).to.eql('s0');
        expect(classes.used).to.eql('s1');
        expect(classes.empty).to.eql('s2');

        expect(backgroundColor).to.eql('rgb(0, 0, 255)');
        expect(fontFamily).to.eql('MyFont');

        expect(global1ClassColor).to.eql('rgb(128, 128, 128)');
        expect(global2ClassColor).to.eql('rgb(228, 228, 228)');
    });
});
