import { spawnSync } from 'child_process';
import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { populateDirectorySync, loadDirSync } from './test-kit';

function runCliCodeMod(cliArgs: string[] = []) {
    const cliPath = require.resolve('@stylable/cli/bin/stc-codemod.js');
    return spawnSync('node', [cliPath, ...cliArgs], { encoding: 'utf8' });
}

describe('Stylable Cli', () => {
    let tempDir: ITempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    describe.only('Code Mods', () => {
        it('apply all code mods when no specific filter applied', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `:import {-st-from: './x'; -st-default: Name}`,
            });

            const { stderr, stdout } = runCliCodeMod([
                '--rootDir',
                tempDir.path,
                '--mods',
                'st-import-to-at-import',
            ]);

            expect(stderr).equal('');

            console.log(stdout);

            const dirContent = loadDirSync(tempDir.path);
            expect(dirContent['style.st.css']).equal('@st-import Name from "./x";');
        });
    });
});
