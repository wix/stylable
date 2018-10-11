import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'library-project';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            port: 3001,
            puppeteerOptions: {
                // headless: false
            }
        },
        before,
        afterEach,
        after
    );

    it('eval bundle exports', async () => {
        const global = { Library: {} };

        new Function('window', projectRunner.getBuildAsset('main.js'))(global);

        expect(Object.keys(global.Library)).to.eql(['Label', 'Button']);
    });

});
