import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'html-snapshot-plugin-project';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-extensions/test/e2e/projects/${project}/webpack.config`)
);

describe(`${project}`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after
    );

    it('contains index snapshot', () => {
        const s = projectRunner.getBuildAsset('snapshots/index.snapshot.html');
        expect(s).to.eql(`<div class="o0__root">Hello World</div>`);
    });
});
