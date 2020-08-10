import MemoryFS from 'memory-fs';

export function memoryFS(): any {
    const mfs = new MemoryFS();
    const lastModified: { [k: string]: Date } = {};

    // memory-fs doens't support stats by default, so we wrap all relevant methods
    // to make it work.
    wrap('writeFileSync', writeFile);
    wrap('unlinkSync', unlink);
    wrap('rmdirSync', rmdir);
    wrap('statSync', stat);
    wrap('mkdir', mkdir);

    type UnknownFunction = (...args: unknown[]) => unknown;

    function mkdir(fn: UnknownFunction, args: unknown[]) {
        // mfs doesn't support supplying the mode!
        if (typeof args[2] === 'function') {
            return fn.apply(mfs, [args[0], args[2]]);
        } else {
            return fn.apply(mfs, args);
        }
    }

    function writeFile(fn: UnknownFunction, args: unknown[]) {
        const filePath = args[0];
        const result = fn.apply(mfs, args);
        lastModified[filePath as string] = new Date();
        return result;
    }

    function unlink(fn: UnknownFunction, args: any) {
        const filePath = args[0];
        const result = fn.apply(mfs, args);
        delete lastModified[filePath];
        return result;
    }

    function rmdir(fn: UnknownFunction, args: any) {
        const dir = args[0];
        const result = fn.apply(mfs, args);
        Object.keys(lastModified).reduce<any>((memo, filePath) => {
            const mtime = lastModified[filePath];
            if (!filePath.startsWith(dir)) {
                memo[filePath] = mtime;
            }
            return memo;
        }, {});
        return result;
    }

    function stat(fn: UnknownFunction, args: any) {
        const filePath = args[0];
        const stats = fn.apply(mfs, args);
        (stats as { mtime: Date }).mtime = lastModified[filePath];
        return stats;
    }

    function wrap<T extends (...args: any[]) => any>(method: keyof MemoryFS, fn: T) {
        const oldFn = mfs[method];
        mfs[method] = (...args: any[]) => {
            return fn(oldFn, args);
        };
    }

    return mfs;
}
