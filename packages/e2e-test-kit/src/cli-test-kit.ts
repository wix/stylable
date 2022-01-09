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

interface Step {
    msg: string;
    action?: () => void | {
        sleep?: number;
    };
}

interface ProcessCliOutputParams {
    dirPath: string;
    args: string[];
    steps: Step[];
    timeout?: number;
}

export function createCliTester() {
    const processes: ChildProcess[] = [];

    async function processCliOutput({
        dirPath,
        args,
        steps,
        timeout = Number(process.env.CLI_WATCH_TEST_TIMEOUT) || 10_000,
    }: ProcessCliOutputParams): Promise<{ output(): string }> {
        const process = runCli(['--rootDir', dirPath, '--log', ...args], dirPath);
        const lines: string[] = [];
        const output = () => lines.join('\n');

        processes.push(process);

        if (!process.stdout) {
            throw new Error('no stdout on cli process');
        }

        // save the output lines to not depened on the reabline async await.
        process.stdout.on('data', (e) => lines.push(e.toString()));

        const found: { message: string; time: number }[] = [];
        const startTime = Date.now();

        return Promise.race([
            onTimeout(timeout, () => new Error(`${JSON.stringify(found, null, 3)}\n\n${output()}`)),
            runSteps(),
        ]);

        function onTimeout(ms: number, rejectWith?: () => unknown) {
            return new Promise<{ output(): string }>((resolve, reject) =>
                setTimeout(() => (rejectWith ? reject(rejectWith()) : resolve({ output })), ms)
            );
        }

        async function runSteps() {
            for await (const line of readLines(process.stdout!)) {
                const step = steps[found.length];

                if (line.includes(step.msg)) {
                    found.push({
                        message: step.msg,
                        time: Date.now() - startTime,
                    });

                    if (step.action) {
                        const { sleep } = step.action() || {};

                        if (typeof sleep === 'number') {
                            await onTimeout(sleep);
                        }
                    }

                    if (steps.length === found.length) {
                        return { output };
                    }
                }
            }
            return { output };
        }
    }

    return {
        run: processCliOutput,
        cleanup() {
            for (const process of processes) {
                process.kill();
            }

            processes.length = 0;
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

export const smlinkSymbol = Symbol('smlink');

export interface LinkedDirectory {
    type: typeof smlinkSymbol;
    path: string;
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
    context: { smlinks: Map<string, Set<string>> } = { smlinks: new Map() }
) {
    for (const [filePath, content] of Object.entries(files)) {
        const path = join(rootDir, filePath);

        if (typeof content === 'object') {
            if (content.type === smlinkSymbol) {
                const existingPath = join(path, content.path as string);
                try {
                    symlinkSync(existingPath, path, 'junction');
                } catch {
                    // The existing path does not exist yet so we save it in the context to create it later.

                    if (!context.smlinks.has(existingPath)) {
                        context.smlinks.set(existingPath, new Set());
                    }

                    context.smlinks.get(existingPath)!.add(path);
                }
            } else {
                mkdirSync(path);

                if (context.smlinks.has(path)) {
                    for (const linkedPath of context.smlinks.get(path)!) {
                        symlinkSync(path, linkedPath, 'junction');
                    }

                    context.smlinks.delete(path);
                }

                populateDirectorySync(path, content as FilesStructure, context);
            }
        } else {
            writeFileSync(path, content);

            if (context.smlinks.has(path)) {
                for (const linkedPath of context.smlinks.get(path)!) {
                    symlinkSync(path, linkedPath, 'junction');
                }

                context.smlinks.delete(path);
            }
        }
    }
}

export function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
