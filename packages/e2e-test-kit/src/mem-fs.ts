const MemoryFS = require('memory-fs');

export function memoryFS() {
    const mfs = new MemoryFS();
    const lastModified: { [k: string]: Date } = {};

    // memory-fs doens't support stats by default, so we wrap all relevant methods
    // to make it work.
    wrap('writeFileSync', writeFile);
    wrap('unlinkSync', unlink);
    wrap('rmdirSync', rmdir);
    wrap('statSync', stat);
    wrap('mkdir', mkdir);

    type UnknownFunction = (...args: Array<unknown>) => unknown;

    function mkdir(fn: UnknownFunction, args: Array<unknown>) {
        // mfs doesn't support supplying the mode!
        if (typeof args[2] === 'function') {
            return fn.apply(mfs, [args[0], args[2]]);
        } else {
            return fn.apply(mfs, args);
        }
    }

    function writeFile(fn: UnknownFunction, args: Array<unknown>) {
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
            if (filePath.indexOf(dir) !== 0) {
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

    function wrap<T extends (...args: any[]) => any>(method: string, fn: T) {
        const oldFn = mfs[method];
        mfs[method] = (...args: any[]) => {
            return fn(oldFn, args);
        };
    }

    return mfs;
}
