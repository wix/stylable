import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'dynamic-split-chunks';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                headless: false,
                devtools: true,
            },
        },
        before,
        afterEach,
        after
    );

    it('should not emit dynamic chunks css', () => {
        const source = projectRunner.getBuildAsset('main.bundle.css');
        const cssAssets = Object.keys(projectRunner.getBuildAssets()).filter((assetsName) =>
            assetsName.endsWith('css')
        );
        expect(typeof source, 'source exist').to.equal('string');
        expect(cssAssets.length, 'only one css emitted').to.equal(1);
    });
});
