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
                'dist/index.mjs',
                'test-components/badge.js',
                'test-components/badge.st.css',
                'src/index-a.js',
            ],
            'entryA',
        );
        expect(chunkByName.entryB).to.eql(
            [
                'dist/index.mjs',
                'test-components/badge.js',
                'test-components/badge.st.css',
                'src/index-b.js',
            ],
            'entryB',
        );
        expect(chunkByName.dynamicSplit).to.eql(
            ['test-components/text.js', 'test-components/text.st.css'],
            'dynamicSplit',
        );
    });
});
