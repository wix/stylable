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
        const chunkByName = getNamedChunks(projectRunner);
        expect(getModulesNames(chunkByName.Button)).to.eql([
            'test-components/button.js',
            'test-components/button.st.css',
            'src/button.js',
            'src/button.st.css',
        ]);
        expect(getModulesNames(chunkByName.Gallery)).to.eql([
            'test-components/label.js',
            'test-components/label.st.css',
            'src/gallery.js',
            'src/gallery.st.css',
        ]);
        expect(getModulesNames(chunkByName.main)).to.eql([
            'cjs/cached-node-renderer.js',
            'cjs/css-runtime-renderer.js',
            'cjs/css-runtime-stylesheet.js',
            'cjs/keyed-list-renderer.js',
            'src/index.js',
        ]);
    });
});

function getNamedChunks(projectRunner: StylableProjectRunner) {
    const s = projectRunner.stats as any;
    const chunkByName: any = {};
    s.compilation.chunks.forEach((chunk: any) => {
        chunkByName[chunk.name] = chunk;
    });
    return chunkByName;
}

function getModulesNames(chunk: any) {
    return Array.from(chunk.modulesIterable).map(
        (m: any) => m.resource && m.resource.split(/[\\/]/).slice(-2).join('/')
    );
}
