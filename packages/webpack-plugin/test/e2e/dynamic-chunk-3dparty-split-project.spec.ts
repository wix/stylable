import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'dynamic-chunk-3dparty-split-project';

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

        expect(chunkByName.Button).to.eql(
            [
                'test-components/button.st.css',
                'src/button.st.css',
                'test-components/button.js',
                'src/button.js',
            ],
            'Button'
        );
        expect(chunkByName.Gallery).to.eql(
            [
                'test-components/label.st.css',
                'src/gallery.st.css',
                'test-components/label.js',
                'src/gallery.js',
            ],
            'Gallery'
        );
        expect(chunkByName.main).to.eql(['src/index.js'], 'main');
    });
});
