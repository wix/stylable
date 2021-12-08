import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'browser-field';
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

    it('renders esm button with override', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);
        const { backgroundColor, fontSize } = await page.$eval('button', (el: HTMLElement) => ({
            fontSize: getComputedStyle(el).fontSize,
            backgroundColor: getComputedStyle(el).backgroundColor,
        }));
        /*
            Expecting the backgroundColor to be green 
            makes sure that the ems style button is rendered
        */
        expect(backgroundColor).to.equal('rgb(0, 128, 0)');
        /* 
           Expecting the font-size override is working 
           makes sure that Stylable resolves stylesheets with the "browser" field configuration
        */
        expect(fontSize).to.equal('35px');

        expect(styleElements).to.eql([
            { id: './node_modules/test-components/esm/button.st.css', depth: '1' },
            { id: './src/app.st.css', depth: '3' },
        ]);
    });
});
