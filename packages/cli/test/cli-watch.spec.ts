import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { expect } from 'chai';
import { on } from 'events';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { messages } from '@stylable/cli';

function runCli(cliArgs: string[] = [], cwd: string) {
    const cliPath = require.resolve('@stylable/cli/bin/stc.js');
    return spawn('node', [cliPath, ...cliArgs], { cwd });
}

interface Files {
    [filepath: string]: string;
}

function loadDirSync(rootPath: string, dirPath: string = rootPath): Files {
    return readdirSync(dirPath).reduce<Files>((acc, entry) => {
        const fullPath = join(dirPath, entry);
        const key = relative(rootPath, fullPath).replace(/\\/g, '/');
        const stat = statSync(fullPath);
        if (stat.isFile()) {
            acc[key] = readFileSync(fullPath, 'utf8');
        } else if (stat.isDirectory()) {
            return {
                ...acc,
                ...loadDirSync(rootPath, fullPath),
            };
        } else {
            throw new Error('Not Implemented');
        }
        return acc;
    }, {});
}

function populateDirectorySync(rootDir: string, files: Files) {
    for (const filePath in files) {
        writeFileSync(join(rootDir, filePath), files[filePath]);
    }
}

describe('Stylable Cli', () => {
    let tempDir: ITempDirectory;
    const cliProcesses: ChildProcessWithoutNullStreams[] = [];
    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        for (const cliProcess of cliProcesses) {
            cliProcess.kill();
        }
        cliProcesses.length = 0;
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

        await processCliOutput(
            cliProcesses,
            tempDir.path,
            ['--cjs=false', '--stcss'],
            [
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
            ]
        );

        expect(loadDirSync(tempDir.path)).to.contain({
            'dist/depend.st.css': '.root{ color:yellow; }',
        });
    });
});

async function processCliOutput(
    cliProcesses: ChildProcessWithoutNullStreams[],
    dirPath: string,
    args: string[],
    steps: Array<{ msg: string; action: () => boolean }>
) {
    const cliProcess = runCli(
        ['--rootDir', dirPath, '--outDir', './dist', '-w', '--log', ...args],
        dirPath
    );
    cliProcesses.push(cliProcess as any);
    let index = 0;

    for await (const e of on(cliProcess.stdout as any, 'data')) {
        const { msg, action } = steps[index];
        if (e.toString().includes(msg)) {
            index++;
            if (action() === false) {
                break;
            }
        }
    }
}

function writeToExistingFile(filePath: string, content: string) {
    if (existsSync(filePath)) {
        writeFileSync(filePath, content);
    } else {
        throw new Error(`file ${filePath} does not exist`);
    }
}
