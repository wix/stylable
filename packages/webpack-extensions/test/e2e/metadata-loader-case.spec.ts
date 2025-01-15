import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname, join } from 'path';
import { getSheetContentAndHash } from './utils.js';

const project = 'metadata-loader-case';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-extensions/test/e2e/projects/${project}/webpack.config`),
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

    it('should create metadata for stylesheet entry contains every import as source and map imports to hashes', () => {
        const bundleContent = projectRunner.getBuildAsset('main.js');

        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const getMetadataFromLibraryBundle = new Function(bundleContent + '\nreturn metadata;');

        const comp = getSheetContentAndHash(join(projectRunner.testDir, 'comp.st.css'));
        const compX = getSheetContentAndHash(join(projectRunner.testDir, 'comp-x.st.css'));
        const index = getSheetContentAndHash(join(projectRunner.testDir, 'index.st.css'));

        const stylesheetMapping = {
            [`/${index.hash}.st.css`]: index.content
                .replace('./comp.st.css', `/${comp.hash}.st.css`)
                .replace('./comp-x.st.css', `/${compX.hash}.st.css`),
            [`/${compX.hash}.st.css`]: compX.content,
            [`/${comp.hash}.st.css`]: comp.content,
        };
        const metadata = getMetadataFromLibraryBundle().default;

        expect({
            entry: metadata.entry,
            stylesheetMapping: metadata.stylesheetMapping,
        }).to.deep.include({
            entry: `/${index.hash}.st.css`,
            stylesheetMapping,
        });

        expect(metadata.namespaceMapping[`/${index.hash}.st.css`]).to.match(/index\d+/);
        expect(metadata.namespaceMapping[`/${comp.hash}.st.css`]).to.match(/comp\d+/);
        expect(metadata.namespaceMapping[`/${compX.hash}.st.css`]).to.match(/comp-x\d+/);
    });
});
