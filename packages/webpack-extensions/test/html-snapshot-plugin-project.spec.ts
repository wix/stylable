// tslint:disable:max-line-length
import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'html-snapshot-plugin-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            port: 3001,
            puppeteerOptions: {
                // headless: false
            }
        },
        before,
        afterEach,
        after
    );

    it('contains index snapshot', async () => {
        const s = projectRunner.getBuildAsset('snapshots/index.snapshot.html');
        expect(s).to.eql(`<div class="o0--root">Hello World</div>`);
    });
});
