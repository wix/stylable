import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'dynamic-split-chunks';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                headless: false,
                devtools: true,
            },
        },
        before,
        afterEach,
        after
    );

    it('should not emit dynamic chunks css', () => {
        const source = projectRunner.getBuildAsset('stylable.css');
        const cssAssets = Object.keys(projectRunner.getBuildAssets()).filter((assetsName) =>
            assetsName.endsWith('css')
        );
        expect(typeof source, 'source exist').to.equal('string');
        expect(cssAssets.length, 'only one css emitted').to.equal(1);
    });
});
