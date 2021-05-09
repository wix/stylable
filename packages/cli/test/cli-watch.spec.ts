import { join } from 'path';
import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { messages } from '@stylable/cli';
import {
    createCliTester,
    loadDirSync,
    populateDirectorySync,
    writeToExistingFile,
} from './test-kit/cli-test-kit';

describe('Stylable Cli', () => {
    let tempDir: ITempDirectory;
    const { run, cleanup } = createCliTester();
    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        cleanup();
        await tempDir.remove();
    });

    it('simple watch mode', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `
                @st-import X from "./depend.st.css";
                .root{ color:red; }
            `,
            'depend.st.css': `
                .root{ color:green; }
            `,
        });

        await run({
            dirPath: tempDir.path,
            args: ['--cjs=false', '--stcss'],
            steps: [
                {
                    msg: messages.START_WATCHING,
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'depend.st.css'),
                            '.root{ color:yellow; }'
                        );
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        return false;
                    },
                },
            ],
        });

        expect(loadDirSync(tempDir.path)).to.contain({
            'dist/depend.st.css': '.root{ color:yellow; }',
        });
    });

    it('should re-build derived files deep', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `
                @st-import [color] from "./depend.st.css";
                .root{ color:value(color); }
            `,
            'depend.st.css': `
                @st-import [color] from "./deep.st.css";
            `,
            'deep.st.css': `
                :vars {
                    color: red;
                }
            `,
        });

        await run({
            dirPath: tempDir.path,
            args: ['--cjs=false', '--css'],
            steps: [
                {
                    msg: messages.START_WATCHING,
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'deep.st.css'),
                            ':vars { color: green; }'
                        );
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        return false;
                    },
                },
            ],
        });
        const files = loadDirSync(tempDir.path);
        expect(files['dist/style.css']).to.include('color:green');
    });
});
