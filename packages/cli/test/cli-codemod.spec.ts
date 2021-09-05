import { processorWarnings } from '@stylable/core';
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

    describe('st-import-to-at-import', () => {
        it('handle all named cases', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `:import {-st-from: './x'; -st-default: Name; -st-named: name1 as name1Alias, name2, keyframes(kf1 as kf1Alias, kf2), keyframes(kf3, kf4), --var1}`,
            });

            runCliCodeMod(['--rootDir', tempDir.path, '--mods', 'st-import-to-at-import']);

            const dirContent = loadDirSync(tempDir.path);

            expect(dirContent['style.st.css']).equal(
                '@st-import Name, [name1 as name1Alias, name2, --var1, keyframes(kf1 as kf1Alias, kf2, kf3, kf4)] from "./x";'
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

    describe('st-global-custom-property-to-at-property', () => {
        it('should handle one param', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `@st-global-custom-property --myVar;`,
            });

            runCliCodeMod([
                '--rootDir',
                tempDir.path,
                '--mods',
                'st-global-custom-property-to-at-property',
            ]);

            const dirContent = loadDirSync(tempDir.path);

            expect(dirContent['style.st.css']).equal('@property st-global(--myVar);');
        });

        it('should handle multiple params', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `@st-global-custom-property --myVar, --mySecondVar, --myThirdVar;`,
            });

            runCliCodeMod([
                '--rootDir',
                tempDir.path,
                '--mods',
                'st-global-custom-property-to-at-property',
            ]);

            const dirContent = loadDirSync(tempDir.path);

            expect(dirContent['style.st.css']).equal(
                '@property st-global(--myVar);\n@property st-global(--mySecondVar);\n@property st-global(--myThirdVar);'
            );
        });

        it('should handle invalid global-custom-property structure', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `@st-global-custom-property --myVar --mySecondVar;`,
            });

            const { stdout } = runCliCodeMod([
                '--rootDir',
                tempDir.path,
                '--mods',
                'st-global-custom-property-to-at-property',
            ]);

            const dirContent = loadDirSync(tempDir.path);

            expect(stdout).to.match(
                new RegExp(
                    `style.st.css: ${processorWarnings.GLOBAL_CSS_VAR_MISSING_COMMA(
                        '--myVar --mySecondVar'
                    )}`
                )
            );
            expect(dirContent['style.st.css']).equal(
                '@st-global-custom-property --myVar --mySecondVar;'
            );
        });
    });
});
