import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'optimizations';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false,
            },
        },
        before,
        afterEach,
        after
    );

    it('generate minimal optimized css', () => {
        const files = projectRunner.getProjectFiles();
        expect(files['dist/stylable.css']).to.eql(
            '.global1{background:gray}.global1 .global2{background-color:#e4e4e4}.s0.o0--x{font-family:MyFont}.s1{background:#00f}'
        );
    });

    it('css is working', async () => {
        const { page } = await projectRunner.openInBrowser();

        const {
            fontFamily,
            backgroundColor,
            classes,
            stVars,
            namespace,
            global1ClassColor,
            global2ClassColor,
        } = await page.evaluate(() => {
            return {
                backgroundColor: getComputedStyle(document.body).backgroundColor,
                fontFamily: getComputedStyle(document.documentElement).fontFamily,
                classes: (window as any).stylableClasses,
                namespace: (window as any).namespace,
                stVars: (window as any).stVars,
                global1ClassColor: getComputedStyle(document.querySelector('.global1')!)
                    .backgroundColor,
                global2ClassColor: getComputedStyle(document.querySelector('.global2')!)
                    .backgroundColor,
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
