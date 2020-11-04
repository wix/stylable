import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'dynamic-bug';

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

    it('split chunks nicely', () => {
        const chunkByName = projectRunner.getChunksModulesNames();

        expect(chunkByName.entryA).to.eql(
            ['test-components/badge.st.css', 'test-components/badge.js', 'src/index-a.js'],
            'entryA'
        );
        expect(chunkByName.entryB).to.eql(
            ['test-components/badge.st.css', 'test-components/badge.js', 'src/index-b.js'],
            'entryB'
        );
        expect(chunkByName.dynamicSplit).to.eql(
            ['test-components/text.st.css', 'test-components/text.js'],
            'dynamicSplit'
        );
    });
});
