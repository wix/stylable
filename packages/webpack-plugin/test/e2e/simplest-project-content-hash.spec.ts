import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'simplest-project-content-hash';

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

    it('renders css', () => {
        const assets =projectRunner.getBuildAssets();
        const file = Object.keys(assets).find((path)=>path.match(/output\.\w+\.css/))!
        expect(assets[file].emitted, 'should emit file with content hash').to.equal(true);
    });

});
