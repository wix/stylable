import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'library-project';
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

    it('eval bundle exports', () => {
        const global = { Library: {} };

        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        new Function('self', projectRunner.getBuildAsset('main.js'))(global);

        expect(Object.keys(global.Library)).to.eql(['Button', 'Label']);
    });
});
