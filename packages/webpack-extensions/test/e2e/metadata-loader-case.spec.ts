import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

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

        const getMetadataFromLibraryBundle = new Function(bundleContent + '\n return metadata;');

        const stylesheetMapping = {
            '/3c91ff3ced60dda25a000b51e53ee7355e33ff3f.st.css':
                '\r\n:import {\r\n    -st-from: "/0065767b52a0aa0f8fdc809ef770921f2b2661a0.st.css";\r\n    -st-default: Comp;\r\n}\r\n\r\n.root {\r\n    -st-extends: Comp;\r\n    color: green;\r\n}',
            '/0065767b52a0aa0f8fdc809ef770921f2b2661a0.st.css': '.root {\r\n    color: red\r\n}',
        };

        expect(getMetadataFromLibraryBundle()).to.deep.include({
            default: {
                entry: '/3c91ff3ced60dda25a000b51e53ee7355e33ff3f.st.css',
                stylesheetMapping,
                namespaceMapping: {
                    '/3c91ff3ced60dda25a000b51e53ee7355e33ff3f.st.css': 'index3785171020',
                    '/0065767b52a0aa0f8fdc809ef770921f2b2661a0.st.css': 'comp585640222',
                },
            },
        });
    });
});
