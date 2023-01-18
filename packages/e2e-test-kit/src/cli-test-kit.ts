import { fork, spawnSync, ChildProcess } from 'child_process';
import { on } from 'events';
import type { Readable } from 'stream';
import { sleep } from 'promise-assist';

type ActionResponse = void | { sleep?: number };

interface Step {
    msg: string;
    action?: () => ActionResponse | Promise<ActionResponse>;
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

        // save the output lines to not depend on the readline async await.
        process.stdout.on('data', (e) => lines.push(e.toString()));

        const found: { message: string; time: number }[] = [];
        const startTime = Date.now();

        return timeoutPromise(
            runSteps(),
            timeout,
            () => `${JSON.stringify(found, null, 3)}\n\n${output()}`
        );

        async function runSteps() {
            for await (const line of readLines(process.stdout!)) {
                const step = steps[found.length];

                if (line.includes(step.msg)) {
                    found.push({
                        message: step.msg,
                        time: Date.now() - startTime,
                    });

                    if (step.action) {
                        const { sleep: sleepMs } = (await step.action()) || {};

                        if (typeof sleepMs === 'number') {
                            await sleep(sleepMs);
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

export function timeoutPromise<T>(
    originalPromise: Promise<T>,
    ms: number,
    timeoutMessage: string | (() => string) = `timed out after ${ms}ms`
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timerId = setTimeout(
            () =>
                reject(
                    new Error(
                        typeof timeoutMessage === 'function' ? timeoutMessage() : timeoutMessage
                    )
                ),
            ms
        );

        originalPromise.then(
            (resolvedValue) => {
                clearTimeout(timerId);
                resolve(resolvedValue);
            },
            (rejectReason) => {
                clearTimeout(timerId);
                reject(rejectReason);
            }
        );
    });
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

export function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
