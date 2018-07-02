// tslint:disable:max-line-length
import { expect } from 'chai';
import { join } from 'path';
import { StylableProjectRunner } from 'stylable-build-test-kit';

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
