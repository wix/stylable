import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'simplest-project-content-hash';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
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

    it('renders css', () => {
        const assets = projectRunner.getBuildAssets();
        const file = Object.keys(assets).find((path) => path.match(/output\.\w+\.\w+\.css/))!;
        expect(assets[file].emitted, 'should emit file with content hash').to.equal(true);
    });
});
