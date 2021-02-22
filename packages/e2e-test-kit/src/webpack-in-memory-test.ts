import { readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import webpack from 'webpack';
import nodeEval from 'node-eval';
import { CustomMemoryFs, memoryFS } from './mem-fs';

export function createMemoryFileSystemWithFiles(
    files: { [fullpath: string]: string },
    includeStylableRuntime = true
) {
    const memfs = memoryFS();

    for (const k in files) {
        const r = resolve(k);
        memfs.mkdirpSync(dirname(r));
        memfs.writeFileSync(r, files[k] || '\n');
    }

    if (includeStylableRuntime) {
        /* 
            TODO: load the runtime code explicitly in all test locations and remove this.
        */
        addStylableRuntimeToMemFs(memfs);
    }

    return memfs;
}

function addStylableRuntimeToMemFs(memfs: CustomMemoryFs) {
    const runtimeDir = dirname(require.resolve('@stylable/runtime'));
    for (const item of readdirSync(runtimeDir, { withFileTypes: true })) {
        if (item.isDirectory()) {
            continue;
        }
        const filePath = join(runtimeDir, item.name);
        memfs.mkdirpSync(dirname(filePath));
        memfs.writeFileSync(filePath, readFileSync(filePath, 'utf8'));
    }
}

export function webpackTest({ files, config }: any) {
    const memfs = createMemoryFileSystemWithFiles(files);
    config.context = resolve('/');

    config.plugins.unshift({
        apply(compiler: webpack.Compiler) {
            // TODO: resolve type issue
            compiler.inputFileSystem = memfs as any;
            compiler.outputFileSystem = memfs as any;
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
