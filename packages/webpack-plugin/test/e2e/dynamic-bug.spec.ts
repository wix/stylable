import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'dynamic-bug';
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

    it('split chunks nicely', () => {
        const chunkByName = projectRunner.getChunksModulesNames();

        expect(chunkByName.entryA).to.eql(
            [
                'test-components/badge.st.css',
                'test-components/badge.js',
                'src/index-a.js',
                'dist/index.mjs',
            ],
            'entryA',
        );
        expect(chunkByName.entryB).to.eql(
            [
                'test-components/badge.st.css',
                'test-components/badge.js',
                'src/index-b.js',
                'dist/index.mjs',
            ],
            'entryB',
        );
        expect(chunkByName.dynamicSplit).to.eql(
            ['test-components/text.st.css', 'test-components/text.js'],
            'dynamicSplit',
        );
    });
});
