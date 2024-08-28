import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { murmurhash3_32_gc } from '@stylable/core/dist/index-internal';
import { dirname } from 'path';

const project = 'namespace-generation-project';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`),
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
        after,
    );

    it('generates persistent namespace', () => {
        const {
            name: localPackageName,
            version: localPackageVersion,
        } = require('./projects/namespace-generation-project/package.json');
        const {
            name: externalPackageName,
            version: externalPackageVersion,
        } = require('./projects/namespace-generation-project/node_modules/test-package/package.json');

        const expectedLocalClassname =
            'index' +
            murmurhash3_32_gc(
                localPackageName + '@' + localPackageVersion + '/' + 'src/index.st.css',
            );
        const expectedImportedClassname =
            'index' +
            murmurhash3_32_gc(
                externalPackageName + '@' + externalPackageVersion + '/' + 'index.st.css',
            );

        const source: string = projectRunner.getBuildAsset('main.js');
        const testPackage = projectRunner.evalAssetModule(source).testPackage;

        expect(testPackage.local).to.equal(expectedLocalClassname);
        expect(testPackage.external).to.equal(expectedImportedClassname);
    });
});
