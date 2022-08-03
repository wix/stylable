import { expect } from 'chai';
import {
    populateDirectorySync,
    loadDirSync,
    runCliCodeMod,
    createTempDirectory,
    ITempDirectory,
} from '@stylable/e2e-test-kit';

describe('CLI Codemods namespace-to-st-namespace', () => {
    let tempDir: ITempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    it('should replace @namespace with @st-namespace', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `@namespace "button";`,
        });

        runCliCodeMod(['--rootDir', tempDir.path, '--mods', 'namespace-to-st-namespace']);

        const dirContent = loadDirSync(tempDir.path);

        expect(dirContent['style.st.css']).equal('@st-namespace "button";');
    });
    it('should not replace @namespace when @st-namespace already exist', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `@namespace "button"; @st-namespace "comp";`,
        });

        runCliCodeMod(['--rootDir', tempDir.path, '--mods', 'namespace-to-st-namespace']);

        const dirContent = loadDirSync(tempDir.path);

        expect(dirContent['style.st.css']).equal('@namespace "button"; @st-namespace "comp";');
    });
    it('should not replace @namespace that would not be used as @st-namespace', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `@namespace "http://button"; @namespace prefix "btn";`,
        });

        runCliCodeMod(['--rootDir', tempDir.path, '--mods', 'namespace-to-st-namespace']);

        const dirContent = loadDirSync(tempDir.path);

        expect(dirContent['style.st.css']).equal(
            '@namespace "http://button"; @namespace prefix "btn";'
        );
    });
});
