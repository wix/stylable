import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'library-project';
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

    it('eval bundle exports', () => {
        const global = { Library: {} as Record<string, unknown> };

        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        new Function('self', projectRunner.getBuildAsset('main.js'))(global);

        expect(typeof global.Library.Button).to.eql('object');
        expect(typeof global.Library.Label).to.eql('object');
    });
});
