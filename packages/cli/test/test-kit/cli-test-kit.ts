import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'fs';
import { spawn, ChildProcessWithoutNullStreams, spawnSync } from 'child_process';
import { on } from 'events';
import { join, relative } from 'path';

export function createCliTester() {
    const cliProcesses: ChildProcessWithoutNullStreams[] = [];

    async function processCliOutput({
        dirPath,
        args,
        steps,
    }: {
        dirPath: string;
        args: string[];
        steps: Array<{ msg: string; action: () => boolean }>;
    }) {
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

export interface Files {
    [filepath: string]: string;
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

export function populateDirectorySync(rootDir: string, files: Files) {
    for (const filePath in files) {
        writeFileSync(join(rootDir, filePath), files[filePath]);
    }
}
