import * as path from 'path';

const sPath = {
    resolve: path.resolve,
    isAbsolute: path.isAbsolute,
    join: path.join,
    basename: path.basename,
    dirname: path.dirname,
    relative: path.relative,
    sep: path.sep
};

export default sPath;

export const sep = {
    toString() {
        return sPath.sep;
    }
};

export const resolve: typeof path.resolve = (...args) => {
    return sPath.resolve(...args);
};

export const isAbsolute: typeof path.isAbsolute = path => {
    return sPath.isAbsolute(path);
};

export const join: typeof path.join = (...args) => {
    return sPath.join(...args);
};

export const basename: typeof path.basename = (p: string, ext?: string) => {
    return sPath.basename(p, ext);
};

export const dirname: typeof path.dirname = (p: string) => {
    return sPath.dirname(p);
};

export const relative: typeof path.relative = (from: string, to: string) => {
    return sPath.relative(from, to);
};
