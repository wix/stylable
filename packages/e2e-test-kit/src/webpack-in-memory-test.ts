import { readdirSync, readFileSync } from 'fs';
import * as path from 'path';
import { memoryFS } from './mem-fs';
const webpack = require('webpack');
const _eval = require('node-eval');

const runtimeDir = path.dirname(require.resolve('@stylable/runtime/cjs'));
const content = readdirSync(runtimeDir).map(f => {
    const fullpath = path.join(runtimeDir, f);
    return {
        content: readFileSync(fullpath, 'utf-8'),
        fullpath
    };
});

export function createMemoryFileSystemWithFiles(files: { [fullpath: string]: string }) {
    const memfs = memoryFS();

    for (const k in files) {
        const r = path.resolve(k);
        memfs.mkdirpSync(path.dirname(r));
        memfs.writeFileSync(r, files[k] || '\n');
    }

    for (const k in content) {
        memfs.mkdirpSync(path.dirname(content[k].fullpath));
        memfs.writeFileSync(content[k].fullpath, content[k].content || '\n');
    }

    return memfs;
}

export function webpackTest({ files, config }: any) {
    const memfs = createMemoryFileSystemWithFiles(files);
    config.context = path.resolve('/');

    config.plugins.unshift({
        apply(compiler: any) {
            compiler.inputFileSystem = memfs;
            compiler.outputFileSystem = memfs;
        }
    });

    const compiler = webpack(config);

    return { compiler, evalCssJSModule, fs: memfs };
}

export function evalCssJSModule(source: string, filename: string = 'file.js') {
    return _eval(source, filename, {
        require(id: string) {
            return { id };
        }
    });
}
