import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { join } from 'path';
import { loadDirSync, populateDirectorySync, runFormatCliSync } from './test-kit/cli-test-kit';

describe('Stylable Code Format Cli', function () {
    this.timeout(25000);
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
        const stylesheetPath = 'style.st.css';

        populateDirectorySync(tempDir.path, {
            [stylesheetPath]: `.root{color:red}`,
        });

        runFormatCliSync(['--target', join(tempDir.path, stylesheetPath)]);

        const dirContent = loadDirSync(tempDir.path);
        expect(dirContent[stylesheetPath]).to.equal('.root {\n    color: red\n}');
    });

    it('should output process log in debug mode', () => {
        const stylesheetPath = 'style.st.css';

        populateDirectorySync(tempDir.path, {
            [stylesheetPath]: `.root{color:red}`,
        });

        const { stdout } = runFormatCliSync(['--target', tempDir.path, '--debug']);

        const dirContent = loadDirSync(tempDir.path);
        expect(dirContent[stylesheetPath]).to.equal('.root {\n    color: red\n}');
        expect(stdout).to.include('[Stylable code formatter] Starting code formatting process');
        expect(stdout).to.include('[Stylable code formatter] Formatting:');
        expect(stdout).to.include('[Stylable code formatter] File formatted successfully');
        expect(stdout).to.include('[Stylable code formatter] All code formatting complete');
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
