import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const hash = require('murmurhash');

const project = 'namespace-generation-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            port: 3002,
            puppeteerOptions: {
                // headless: false
            }
        },
        before,
        afterEach,
        after
    );

    it('generates persistent namespace', () => {
        const {
            name: localPackageName,
            version: localPackageVersion
         } = require('./projects/namespace-generation-project/package.json');
        const {
            name: externalPackageName,
            version: externalPackageVersion
        } = require('./projects/namespace-generation-project/node_modules/test-package/package.json');
        // tslint:disable:max-line-length
        const expectedLocalClassname = 'index' + hash.v3(localPackageName + '@' + localPackageVersion + '/' + 'src/index.st.css');
        const expectedImportedClassname = 'index' + hash.v3(externalPackageName + '@' + externalPackageVersion + '/' + 'index.st.css');
        // tslint:enable:max-line-length

        const source: string = projectRunner.getBuildAsset('main.js');
        const testPackage = projectRunner.evalAssetModule(source).testPackage;

        expect(testPackage.local).to.equal(expectedLocalClassname);
        expect(testPackage.external).to.equal(expectedImportedClassname);
    });
});
