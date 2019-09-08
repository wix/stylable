import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { join, resolve } from 'path';

const project = '3rd-party-standalone-manifest';

const internalProjectPath = resolve(__dirname, './projects/3rd-party-standalone-manifest/node_modules/test-components');
const resolver = require.resolve('@stylable/node/src');

const r = [
    `--rootDirCWD`,
    `--rootDir=${JSON.stringify(internalProjectPath)}`,
    '--srcDir=src',
    '--outDir=dist',
    '--cjs', 
    '--stcss',
    '--css',
    '--log',
    `--nsr=${resolver}`,
    '--manifest'
];

spawnSync('yarn stc ' + r.join(' '), {shell: true})
// console.log(_re.stdout.toString())
// console.log(_re.stderr.toString())

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
