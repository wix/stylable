import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'dynamic-chunk-3rd-party-split-project';
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

        expect(chunkByName.Button).to.eql(
            [
                'test-components/button.js',
                'test-components/button.st.css',
                'src/button.js',
                'src/button.st.css',
            ],
            'Button',
        );
        expect(chunkByName.Gallery).to.eql(
            [
                'test-components/label.js',
                'test-components/label.st.css',
                'src/gallery.js',
                'src/gallery.st.css',
            ],
            'Gallery',
        );
        expect(chunkByName.main).to.eql(['dist/index.mjs', 'src/index.js'], 'main');
    });
});
