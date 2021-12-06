import {
    readdirSync,
    readFileSync,
    statSync,
    writeFileSync,
    existsSync,
    mkdirSync,
    symlinkSync,
} from 'fs';
import { fork, spawnSync, ChildProcess } from 'child_process';
import { on } from 'events';
import { join, relative } from 'path';
import type { Readable } from 'stream';

interface ProcessCliOutputParams {
    dirPath: string;
    args: string[];
    steps: Array<{
        msg: string;
        action?: () => void | {
            sleep?: number;
        };
    }>;
}

export function createCliTester() {
    const cliProcesses: ChildProcess[] = [];

    async function processCliOutput({ dirPath, args, steps }: ProcessCliOutputParams): Promise<{
        output: string;
    }> {
        const cliProcess = runCli(['--rootDir', dirPath, '--log', ...args], dirPath);
        cliProcesses.push(cliProcess);

        const found = [];
        let output = '';

        if (!cliProcess.stdout) {
            throw new Error('no stdout on cli process');
        }
        for await (const line of readLines(cliProcess.stdout)) {
            const step = steps[found.length];
            output += `\n${line}`;

            if (line.includes(step.msg)) {
                found.push(true);

                if (step.action) {
                    const { sleep } = step.action() || {};

                    if (typeof sleep === 'number') {
                        await new Promise((res) => setTimeout(res, sleep));
                    }
                }

                if (steps.length === found.length) {
                    return { output };
                }
            }
        }

        return { output };
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

const stcPath = require.resolve('@stylable/cli/bin/stc.js');
const formatPath = require.resolve('@stylable/cli/bin/stc-format.js');
const codeModPath = require.resolve('@stylable/cli/bin/stc-codemod.js');

export function runCli(cliArgs: string[] = [], cwd: string) {
    return fork(stcPath, cliArgs, { cwd, stdio: 'pipe' });
}

export function runCliSync(cliArgs: string[] = []) {
    return spawnSync('node', [stcPath, ...cliArgs], { encoding: 'utf8' });
}

export function runFormatCliSync(cliArgs: string[] = []) {
    return spawnSync('node', [formatPath, ...cliArgs], { encoding: 'utf8' });
}

export function runCliCodeMod(cliArgs: string[] = []) {
    return spawnSync('node', [codeModPath, ...cliArgs], { encoding: 'utf8' });
}

export interface Files {
    [filepath: string]: string;
}

export const smlinkDirSymbol = Symbol('smlink');

export interface LinkedDirectory {
    type: typeof smlinkDirSymbol;
    smlinkDirPath: string;
}
export interface FilesStructure {
    [filepath: string]: string | FilesStructure | LinkedDirectory;
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

export function populateDirectorySync(
    rootDir: string,
    files: FilesStructure,
    context: { smlinkFiles: Map<string, Set<string>> } = { smlinkFiles: new Map() }
) {
    for (const [filePath, content] of Object.entries(files)) {
        if (typeof content === 'object') {
            const dirPath = join(rootDir, filePath);

            if (content.type === smlinkDirSymbol) {
                const existingPath = join(dirPath, content.smlinkDirPath as string);
                try {
                    symlinkSync(existingPath, dirPath);
                } catch {
                    if (!context.smlinkFiles.has(existingPath)) {
                        context.smlinkFiles.set(existingPath, new Set());
                    }

                    context.smlinkFiles.get(existingPath)!.add(dirPath);
                }
            } else {
                mkdirSync(dirPath);

                if (context.smlinkFiles.has(dirPath)) {
                    for (const linkedFile of context.smlinkFiles.get(dirPath)!) {
                        symlinkSync(dirPath, linkedFile);
                    }

                    context.smlinkFiles.delete(dirPath);
                }

                populateDirectorySync(dirPath, content as FilesStructure, context);
            }
        } else {
            writeFileSync(join(rootDir, filePath), content);
        }
    }
}

export function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
