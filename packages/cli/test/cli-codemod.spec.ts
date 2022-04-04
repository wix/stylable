import { expect } from 'chai';
import {
    populateDirectorySync,
    loadDirSync,
    runCliCodeMod,
    createTempDirectory,
    ITempDirectory,
} from '@stylable/e2e-test-kit';
import type { CodeMod } from '@stylable/cli';

describe('Stylable Cli Code Mods', () => {
    let tempDir: ITempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    it('apply built-in code mods', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `:import {-st-from: './x'; -st-default: Name} .dummy{}`,
        });

        runCliCodeMod(['--rootDir', tempDir.path, '--mods', 'st-import-to-at-import']);

        const dirContent = loadDirSync(tempDir.path);
        expect(dirContent['style.st.css']).equal('@st-import Name from "./x"; .dummy{}');
    });

    it('should load external codemods', () => {
        const inlineCodeMod: CodeMod = ({ ast, postcss }) => {
            ast.append(postcss.comment({ text: 'Hello CodeMod' }));

            return {
                changed: true,
            };
        };

        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'my-custom-mod.js': `module.exports.codemods = [{id:'banner', apply: ${inlineCodeMod}}]`,
            'style.st.css': ``,
        });

        runCliCodeMod(['--rootDir', tempDir.path, '--external', './my-custom-mod.js']);

        const dirContent = loadDirSync(tempDir.path);
        expect(dirContent['style.st.css']).equal('/* Hello CodeMod */');
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

    it('should report skipped files with no changes', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{}`,
        });

        const { stdout } = runCliCodeMod([
            '--rootDir',
            tempDir.path,
            '--mods',
            'st-import-to-at-import',
        ]);

        const dirContent = loadDirSync(tempDir.path);

        expect(dirContent['style.st.css']).equal(`.root{}`);
        expect(stdout, 'Summery contains the skipped file prefixed with "−"').to.match(
            /Summery:\n\[CodeMod\] − .*?style\.st\.css/
        );
    });

    it('should fail with exit code 1 when failed to load a mod', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{}`,
        });

        const { stdout, status } = runCliCodeMod([
            '--rootDir',
            tempDir.path,
            '--external',
            'unknown-mod.js',
        ]);

        expect(status, 'exit code').to.equal(1);
        expect(stdout).to.match(/Failed to load external codemods from: unknown-mod.js/);
    });
});
