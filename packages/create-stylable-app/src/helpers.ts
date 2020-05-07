import path from 'path';
import { promises } from 'fs';
import { spawn, SpawnOptions } from 'child_process';
import { once } from 'events';

export interface DirectoryItem {
    type: 'directory' | 'file';
    name: string;
    path: string;
    relativePath: string;
}

/**
 * Deeply iterate into a directory's child directories/files.
 * Provides `DirectoryItem` instances for each item, giving parents before leafs.
 *
 * @param directoryPath directory to iterate into.
 * @param basePath base directory to compute relative paths from. defaults to `directoryPath`.
 */
export async function* directoryDeepChildren(
    directoryPath: string,
    basePath = directoryPath
): AsyncGenerator<DirectoryItem, void, unknown> {
    for (const item of await promises.readdir(directoryPath, { withFileTypes: true })) {
        const itemName = item.name;
        const itemPath = path.join(directoryPath, itemName);
        const relativePath = path.relative(basePath, itemPath);
        if (item.isFile()) {
            yield { type: 'file', path: itemPath, name: itemName, relativePath };
        } else if (item.isDirectory()) {
            yield { type: 'directory', path: itemPath, name: itemName, relativePath };
            yield* directoryDeepChildren(itemPath, basePath);
        }
    }
}

/**
 * `fs.promise.stat` that returns `undefined` instead of rejecting.
 */
export async function statSafe(path: string) {
    try {
        return await promises.stat(path);
    } catch {
        return undefined;
    }
}

/**
 * `childProcess.spawn` that rejects if command returned non-falsy exit code.
 */
export async function spawnSafe(command: string, args: string[], options?: SpawnOptions) {
    const commandProcess = spawn(command, args, options as SpawnOptions);
    const [exitCode] = (await once(commandProcess, 'exit')) as [number | null];
    if (exitCode) {
        throw new Error(`"${command} ${args.join(' ')}" exited with code ${exitCode}.`);
    }
}

export async function executeWithProgress(
    message: string,
    action: () => Promise<any>,
    dotIntervalMs = 5000
) {
    let dotInterval: ReturnType<typeof setInterval> | undefined;
    try {
        if (dotIntervalMs) {
            dotInterval = setInterval(() => process.stdout.write('.'), dotIntervalMs);
        }
        process.stdout.write(message);
        if (dotInterval === undefined) {
            process.stdout.write('\n');
        }
        await action();
    } finally {
        if (dotInterval !== undefined) {
            clearInterval(dotInterval);
            process.stdout.write('\n');
        }
    }
}
