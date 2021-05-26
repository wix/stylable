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

    describe('Code Mods', () => {
        it('apply all code mods when no specific filter applied', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `:import {-st-from: './x'; -st-default: Name}`,
            });

            runCliCodeMod(['--rootDir', tempDir.path, '--mods', 'st-import-to-at-import']);

            const dirContent = loadDirSync(tempDir.path);
            expect(dirContent['style.st.css']).equal('@st-import Name from "./x";');
        });
    });

    describe(':import to @st-import', () => {
        it('handle all named cases', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `:import {-st-from: './x'; -st-default: Name; -st-named: name1, name2, keyframes(kf1, kf2), keyframes(kf3, kf4), --var1}`,
            });

            runCliCodeMod(['--rootDir', tempDir.path, '--mods', 'st-import-to-at-import']);

            const dirContent = loadDirSync(tempDir.path);

            expect(dirContent['style.st.css']).equal(
                '@st-import Name, [name1, name2, --var1, keyframes(kf1, kf2, kf3, kf4)] from "./x";'
            );
        });
    });
});
