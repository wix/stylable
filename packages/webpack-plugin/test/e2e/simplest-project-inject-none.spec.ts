import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'simplest-project-inject-none';

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

    it('css is injected before entry running', () => {
        const assets = projectRunner.getBuildAssets();
        const files = Object.keys(assets);
        const cssFile = files.find((f) => f.endsWith('css'));
        expect(cssFile, 'should not find and css files').to.equal(undefined);
        files.forEach((file) => {
            expect(assets[file].source()).to.not.include(`__webpack_require__.sti`);
        });
    });
});
