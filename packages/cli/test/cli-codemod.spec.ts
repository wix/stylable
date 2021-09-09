import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { populateDirectorySync, loadDirSync } from './test-kit/cli-test-kit';
import { runCliCodeMod } from './test-kit/cli-test-kit';

describe('Stylable Cli Code Mods', () => {
    let tempDir: ITempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    it('apply all code mods when no specific filter applied', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `:import {-st-from: './x'; -st-default: Name}`,
        });

        runCliCodeMod(['--rootDir', tempDir.path, '--mods', 'st-import-to-at-import']);

        const dirContent = loadDirSync(tempDir.path);
        expect(dirContent['style.st.css']).equal('@st-import Name from "./x";');
    });

    it('should handle parse failure', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `:import {-st-from: './x' -st-default: Name}`, // missing semi column
        });

        const { stdout } = runCliCodeMod([
            '--rootDir',
            tempDir.path,
            '--mods',
            'st-import-to-at-import',
        ]);

        const dirContent = loadDirSync(tempDir.path);

        expect(dirContent['style.st.css']).equal(`:import {-st-from: './x' -st-default: Name}`);
        expect(stdout).to.match(/failed to parse/);
        expect(stdout).to.match(/CssSyntaxError: <css input>:1:20: Missed semicolon/);
    });
});
