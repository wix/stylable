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
            }
        },
        before,
        afterEach,
        after
    );

    it('split chunks nicely', () => {
        const chunkByName = getNamedChunks(projectRunner);

        expect(getModulesNames(chunkByName.entryA)).to.eql([
            'test-components/badge.js',
            'test-components/badge.st.css',
            'src/index-a.js'
        ]);
        expect(getModulesNames(chunkByName.entryB)).to.eql([
            'test-components/badge.js',
            'test-components/badge.st.css',
            'src/index-b.js'
        ]);
        expect(getModulesNames(chunkByName.dynamicSplit)).to.eql([
            'test-components/text.js',
            'test-components/text.st.css'
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
        (m: any) =>
            m.resource &&
            m.resource
                .split(/[\\/]/)
                .slice(-2)
                .join('/')
    );
}
