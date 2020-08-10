import { readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import webpack from 'webpack';
import nodeEval from 'node-eval';
import { memoryFS } from './mem-fs';

const runtimeDir = dirname(require.resolve('@stylable/runtime/cjs'));
const content = readdirSync(runtimeDir).map((f) => {
    const fullpath = join(runtimeDir, f);
    return {
        content: readFileSync(fullpath, 'utf-8'),
        fullpath,
    };
});

export function createMemoryFileSystemWithFiles(files: { [fullpath: string]: string }) {
    const memfs = memoryFS();

    for (const k in files) {
        const r = resolve(k);
        memfs.mkdirpSync(dirname(r));
        memfs.writeFileSync(r, files[k] || '\n');
    }

    for (const entry of content) {
        memfs.mkdirpSync(dirname(entry.fullpath));
        memfs.writeFileSync(entry.fullpath, entry.content || '\n');
    }

    return memfs;
}

export function webpackTest({ files, config }: any) {
    const memfs = createMemoryFileSystemWithFiles(files);
    config.context = resolve('/');

    config.plugins.unshift({
        apply(compiler: any) {
            compiler.inputFileSystem = memfs;
            compiler.outputFileSystem = memfs;
        },
    });

    const compiler = webpack(config);

    return { compiler, evalCssJSModule, fs: memfs };
}

export function evalCssJSModule(source: string, filename = 'file.js') {
    return nodeEval(source, filename, {
        require(id: string) {
            return { id };
        },
    });
}
