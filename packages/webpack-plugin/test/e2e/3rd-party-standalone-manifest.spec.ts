import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { join, resolve } from 'path';

const project = '3rd-party-standalone-manifest';

const internalProjectPath = resolve(__dirname, './projects/3rd-party-standalone-manifest/node_modules/test-components');
const r = [
    `--rootDir="${internalProjectPath}"`,
    '--srcDir=src',
    '--outDir=dist',
    '--cjs', 
    '--stcss',
    '--css',
    '--log'
    
];

console.log(internalProjectPath)
const _re = spawnSync('yarn stc ' + r.join(' '), {shell: true})
console.log(_re.stdout.toString())

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                headless: false
            }
        },
        before,
        afterEach,
        after
    );

    

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);

        expect(styleElements).to.eql([
            { id: './node_modules/test-components/dist/button.st.css', depth: '1' },
            // {
            //     id: './node_modules/test-components/index.st.css',
            //     depth: '2'
            // },
            { id: './src/index.st.css', depth: '3' }
        ]);
    });

    it('check that we use built namespace', async () => {
        const st = require('./projects/3rd-party-standalone-manifest/node_modules/test-components/dist/button.st.css.js');

        const { page } = await projectRunner.openInBrowser();
        const className = await page.evaluate(() => {
            const btn = (window as any).btn;
            return btn.className;
        });
        
        expect(className).to.eql(st.classes.root);

    });
});
