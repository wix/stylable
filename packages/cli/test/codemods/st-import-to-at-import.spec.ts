import { processorWarnings } from '@stylable/core';
import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { populateDirectorySync, loadDirSync } from '../test-kit/cli-test-kit';
import { runCliCodeMod } from '../test-kit/cli-test-kit';

describe('CLI Codemods st-import-to-at-import', () => {
    let tempDir: ITempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    it('handle all named cases', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `:import {-st-from: './x'; -st-default: Name; -st-named: name1 as name1Alias, name2, keyframes(kf1 as kf1Alias, kf2), keyframes(kf3, kf4), --var1}`,
        });

        runCliCodeMod(['--rootDir', tempDir.path, '--mods', 'st-import-to-at-import']);

        const dirContent = loadDirSync(tempDir.path);

        expect(dirContent['style.st.css']).equal(
            '@st-import Name, [name1 as name1Alias, name2, --var1, keyframes(kf1 as kf1Alias, kf2, kf3, kf4)] from "./x"'
        );
    });

    it('handle import error', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `:import {-st-from: './x.st.css'; -st-from: './y.st.css';}`,
        });

        const { stdout } = runCliCodeMod([
            '--rootDir',
            tempDir.path,
            '--mods',
            'st-import-to-at-import',
        ]);

        const dirContent = loadDirSync(tempDir.path);

        expect(dirContent['style.st.css']).equal(
            `:import {-st-from: './x.st.css'; -st-from: './y.st.css';}`
        );
        expect(stdout).to.match(new RegExp(processorWarnings.MULTIPLE_FROM_IN_IMPORT()));
    });
});
