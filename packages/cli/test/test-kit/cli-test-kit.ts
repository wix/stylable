import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { spawn, ChildProcessWithoutNullStreams, spawnSync } from 'child_process';
import { on } from 'events';
import { join, relative } from 'path';
import type { Readable } from 'stream';

export function createCliTester() {
    const cliProcesses: ChildProcessWithoutNullStreams[] = [];

    async function processCliOutput({
        dirPath,
        args,
        steps,
    }: {
        dirPath: string;
        args: string[];
        steps: Array<{ msg: string; action?: () => void }>;
    }) {
        const cliProcess = runCli(['--rootDir', dirPath, '--log', ...args], dirPath);
        cliProcesses.push(cliProcess as any);
        const found = [];

        for await (const line of readLines(cliProcess.stdout)) {
            const step = steps[found.length];

            if (line.includes(step.msg)) {
                found.push(true);

                if (step.action) {
                    step.action();
                }

                if (steps.length === found.length) {
                    return;
                }
            }
        }
    }

    return {
        run: processCliOutput,
        cleanup() {
            for (const cliProcess of cliProcesses) {
                cliProcess.kill();
            }
            cliProcesses.length = 0;
        },
    };
}

async function* readLines(readable: Readable) {
    let buffer = '';
    for await (const e of on(readable, 'data')) {
        for (const char of e.toString()) {
            if (char === '\n') {
                yield buffer;
                buffer = '';
            } else {
                buffer += char;
            }
        }
    }
    yield buffer;
}

export function writeToExistingFile(filePath: string, content: string) {
    if (existsSync(filePath)) {
        writeFileSync(filePath, content);
    } else {
        throw new Error(`file ${filePath} does not exist`);
    }
}

export function runCli(cliArgs: string[] = [], cwd: string) {
    const cliPath = require.resolve('@stylable/cli/bin/stc.js');
    return spawn('node', [cliPath, ...cliArgs], { cwd });
}

export function runCliSync(cliArgs: string[] = []) {
    const cliPath = require.resolve('@stylable/cli/bin/stc.js');
    return spawnSync('node', [cliPath, ...cliArgs], { encoding: 'utf8' });
}

export function runFormatCliSync(cliArgs: string[] = []) {
    const cliPath = require.resolve('@stylable/cli/bin/stc-format.js');
    return spawnSync('node', [cliPath, ...cliArgs], { encoding: 'utf8' });
}

export function runCliCodeMod(cliArgs: string[] = []) {
    const cliPath = require.resolve('@stylable/cli/bin/stc-codemod.js');
    return spawnSync('node', [cliPath, ...cliArgs], { encoding: 'utf8' });
}

export interface Files {
    [filepath: string]: string;
}

export interface FilesStructure {
    [filepath: string]: string | FilesStructure;
}

export function loadDirSync(rootPath: string, dirPath: string = rootPath): Files {
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

export function populateDirectorySync(rootDir: string, files: FilesStructure) {
    for (const [filePath, content] of Object.entries(files)) {
        if (typeof content === 'object') {
            const dirPath = join(rootDir, filePath);
            mkdirSync(dirPath);
            populateDirectorySync(dirPath, content);
        } else {
            writeFileSync(join(rootDir, filePath), content);
        }
    }
}
