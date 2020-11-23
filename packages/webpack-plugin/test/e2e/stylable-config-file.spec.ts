import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'stylable-config-file';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after
    );

    it('output css asset as written in the stylable.config file', () => {
        const asset = projectRunner.getBuildAsset('test.css');
        expect(asset).to.equal('.o0__root{background-color:red}');
    });
});
