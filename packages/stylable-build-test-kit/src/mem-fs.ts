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

    function mkdir(fn: typeof mkdir, args: any[]) {
        // mfs doesn't support supplying the mode!
        if (typeof args[2] === 'function') {
            return fn.apply(mfs, [args[0], args[2]]);
        } else {
            return fn.apply(mfs, args);
        }
    }

    function writeFile(fn: typeof writeFile, args: any[]) {
        const filePath = args[0];
        const result = fn.apply(mfs, args);
        lastModified[filePath] = new Date();
        return result;
    }

    function unlink(fn: typeof unlink, args: any[]) {
        const filePath = args[0];
        const result = fn.apply(mfs, args);
        delete lastModified[filePath];
        return result;
    }

    function rmdir(fn: typeof rmdir, args: any[]) {
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

    function stat(fn: typeof stat, args: any[]) {
        const filePath = args[0];
        const stats = fn.apply(mfs, args);
        stats.mtime = lastModified[filePath];
        return stats;
    }

    function wrap(method: string, fn: (...args: any[]) => any) {
        const oldFn = mfs[method];
        mfs[method] = (...args: any[]) => {
            return fn(oldFn, args);
        };
    }

    return mfs;
}
