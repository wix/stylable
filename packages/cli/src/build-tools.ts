import type { FileSystem } from '@stylable/node';
import { dirname } from 'path';

export function tryRun<T>(fn: () => T, errorMessage: string): T {
    try {
        return fn();
    } catch (e) {
        throw new Error(errorMessage + ': \n' + (e as Error)?.stack);
    }
}

export function normalizeRelative(p: string) {
    p = p.replace(/\\/g, '/');
    return p.startsWith('.') ? p : './' + p;
}

export function ensureDirectory(dir: string, fs: FileSystem) {
    if (dir === '.' || fs.existsSync(dir)) {
        return;
    }
    try {
        fs.mkdirSync(dir);
    } catch (e) {
        const parentDir = dirname(dir);
        if (parentDir !== dir) {
            ensureDirectory(parentDir, fs);
            fs.mkdirSync(dir);
        }
    }
}
