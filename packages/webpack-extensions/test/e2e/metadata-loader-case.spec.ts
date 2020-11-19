import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';
import { readFileSync } from 'fs';
import { hashContent } from '../../src/hash-content-util';

const project = 'metadata-loader-case';

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

    it('should create metadata for stylesheet entry contains every import as source and map imports to hashes', () => {
        const bundleContent = projectRunner.getBuildAsset('main.js');

        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const getMetadataFromLibraryBundle = new Function(bundleContent + '\nreturn metadata;');

        const compContent = readFileSync(join(projectRunner.projectDir, 'comp.st.css'), 'utf-8');
        const indexContent = readFileSync(join(projectRunner.projectDir, 'index.st.css'), 'utf-8');
        const indexHash = hashContent(indexContent);
        const compHash = hashContent(compContent);
        const stylesheetMapping = {
            [`/${indexHash}.st.css`]: indexContent.replace('./comp.st.css', `/${compHash}.st.css`),
            [`/${compHash}.st.css`]: compContent,
        };
        const metadata = getMetadataFromLibraryBundle().default;

        expect({
            entry: metadata.entry,
            stylesheetMapping: metadata.stylesheetMapping,
        }).to.deep.include({
            entry: `/${indexHash}.st.css`,
            stylesheetMapping,
        });

        expect(metadata.namespaceMapping[`/${indexHash}.st.css`]).to.match(/index\d+/);
        expect(metadata.namespaceMapping[`/${compHash}.st.css`]).to.match(/comp\d+/);
    });
});
