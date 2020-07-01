import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'library-project';

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

    it('eval bundle exports', () => {
        const global = { Library: {} };

        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        new Function('window', projectRunner.getBuildAsset('main.js'))(global);

        expect(Object.keys(global.Library)).to.eql(['Label', 'Button']);
    });
});
