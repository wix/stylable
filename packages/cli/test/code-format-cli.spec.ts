import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { join } from 'path';
import { loadDirSync, populateDirectorySync, runFormatCliSync } from '@stylable/e2e-test-kit';

describe('Stylable Code Format Cli', function () {
    let tempDir: ITempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    it('should format a directory with a single stylesheet', () => {
        const stylesheetPath = 'style.st.css';

        populateDirectorySync(tempDir.path, {
            [stylesheetPath]: `.root{color:red}`,
        });

        runFormatCliSync(['--target', tempDir.path]);

        const dirContent = loadDirSync(tempDir.path);
        expect(dirContent[stylesheetPath]).to.equal('.root {\n    color: red\n}');
    });

    it('should format a directory deeply with a multiple stylesheets', () => {
        const stylesheetPath1 = 'style.st.css';
        const stylesheetPath2 = 'a.st.css';
        const stylesheetPath3 = 'b.st.css';
        const stylesheetPath4 = 'c.st.css';

        populateDirectorySync(tempDir.path, {
            [stylesheetPath1]: `.root{color:red}`,
            a: {
                [stylesheetPath2]: `.root{color:red}`,
                [stylesheetPath3]: `.root{color:red}`,
                c: {
                    [stylesheetPath4]: `.root{color:red}`,
                },
            },
        });

        runFormatCliSync(['--target', tempDir.path]);

        const dirContent = loadDirSync(tempDir.path);
        const expectedOutput = '.root {\n    color: red\n}';

        expect(dirContent[stylesheetPath1]).equal(expectedOutput);
        expect(dirContent['a/' + stylesheetPath2]).equal(expectedOutput);
        expect(dirContent['a/' + stylesheetPath3]).equal(expectedOutput);
        expect(dirContent['a/c/' + stylesheetPath4]).equal(expectedOutput);
    });

    it('should format a specific stylesheet', () => {
        const stylesheetPath1 = 'style.st.css';
        const stylesheetPath2 = 'other.st.css';

        populateDirectorySync(tempDir.path, {
            [stylesheetPath1]: `.root{color:red}`,
            [stylesheetPath2]: `.root{color:red}`,
        });

        runFormatCliSync(['--target', join(tempDir.path, stylesheetPath1)]);

        const dirContent = loadDirSync(tempDir.path);
        expect(dirContent[stylesheetPath1]).to.equal('.root {\n    color: red\n}');
        expect(dirContent[stylesheetPath2]).to.equal(`.root{color:red}`);
    });

    describe('logging', () => {
        it('should output files formatted to log by default', () => {
            const stylesheetPath = 'style.st.css';

            populateDirectorySync(tempDir.path, {
                [stylesheetPath]: `.root{color:red}`,
            });

            const { stdout } = runFormatCliSync(['--target', tempDir.path]);

            const dirContent = loadDirSync(tempDir.path);
            expect(dirContent[stylesheetPath]).to.equal('.root {\n    color: red\n}');
            expect(stdout).to.include('[Stylable code formatter] Formatted:');
        });

        it('should output process log in debug mode', () => {
            const stylesheetPath = 'style.st.css';

            populateDirectorySync(tempDir.path, {
                [stylesheetPath]: `.root{color:red}`,
            });

            const { stdout } = runFormatCliSync(['--target', tempDir.path, '--debug']);

            const dirContent = loadDirSync(tempDir.path);
            expect(dirContent[stylesheetPath]).to.equal('.root {\n    color: red\n}');
            expect(stdout).to.include('[Stylable code formatter] Starting code formatting');
            expect(stdout).to.include('[Stylable code formatter] Formatted:');
            expect(stdout).to.include('[Stylable code formatter] All code formatting complete');
        });

        it('should output no log in silent mode', () => {
            const stylesheetPath = 'style.st.css';

            populateDirectorySync(tempDir.path, {
                [stylesheetPath]: `.root{color:red}`,
            });

            const { stdout } = runFormatCliSync(['--target', tempDir.path, '--silent']);

            const dirContent = loadDirSync(tempDir.path);
            expect(dirContent[stylesheetPath]).to.equal('.root {\n    color: red\n}');
            expect(stdout).to.equal('');
        });

        it('should log output when no formatting is needed.', () => {
            const stylesheetPath = 'style.st.css';

            populateDirectorySync(tempDir.path, {
                [stylesheetPath]: '.root {\n    color: red\n}',
            });

            const { stdout } = runFormatCliSync(['--target', tempDir.path, '--debug']);

            const dirContent = loadDirSync(tempDir.path);
            expect(dirContent[stylesheetPath]).to.equal('.root {\n    color: red\n}');
            expect(stdout).to.include('[Stylable code formatter] All code formatting complete');
        });
    });

    describe('exceptions', () => {
        it('should throw an exception when no stylable stylesheets are found to format', () => {
            const filePath = 'file.txt';

            const fileContent = 'NOT STYLABLE CONTENT';
            populateDirectorySync(tempDir.path, {
                [filePath]: fileContent,
            });

            const { stderr, stdout } = runFormatCliSync(['--target', tempDir.path]);

            const dirContent = loadDirSync(tempDir.path);
            expect(dirContent[filePath]).to.equal(fileContent);
            expect(stdout).to.equal('');
            expect(stderr).to.include(
                'cannot find any Stylable stylesheets (.st.css) in directory'
            );
        });

        it('should throw an exception when a specific file to format is not a stylable stylesheet', () => {
            const filePath = 'file.txt';

            const fileContent = 'NOT STYLABLE CONTENT';
            populateDirectorySync(tempDir.path, {
                [filePath]: fileContent,
            });

            const { stderr, stdout } = runFormatCliSync(['--target', join(tempDir.path, filePath)]);

            const dirContent = loadDirSync(tempDir.path);
            expect(dirContent[filePath]).to.equal(fileContent);
            expect(stdout).to.equal('');
            expect(stderr).to.include('cannot format file, not a Stylable stylesheet (.st.css)');
        });
    });
});
