import { create } from '@stylable/runtime';
import { stylableModuleFactory, Options } from '@stylable/module-utils';
import type { IDirectoryContents } from '@file-services/types';
import { createMemoryFs, IMemFileSystem } from '@file-services/memory';
import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

function evalModule(id: string, source: string, requireModule: (s: string) => any) {
    if (!source) {
        throw new Error('No source is provided to evalModule');
    }
    const _module = {
        id,
        exports: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function('module', 'exports', 'require', source);
    fn(_module, _module.exports, requireModule);

    return _module.exports;
}
/**
 * This function mocks the runtime and only provide the create function
 */
export function evalStylableModule<T = unknown>(source: string, fullPath: string): T {
    return evalModule(fullPath, source, (id) => {
        if (id === '@stylable/runtime') {
            return { create };
        }
        throw new Error(`Could not find module: ${id}`);
    }) as T;
}

export function moduleFactoryTestKit(files: IDirectoryContents, options: Partial<Options> = {}) {
    const fs = createMemoryFs(files);
    addStylableRuntimeToMemFs(fs);
    const factory = stylableModuleFactory(
        {
            resolveNamespace: (namespace) => namespace,
            fileSystem: fs,
            projectRoot: '/',
        },
        options
    );

    return {
        fs,
        factory,
        evalStylableModule,
    };
}

function addStylableRuntimeToMemFs(fs: IMemFileSystem) {
    const runtimeDir = dirname(require.resolve('@stylable/runtime'));
    for (const item of readdirSync(runtimeDir, { withFileTypes: true })) {
        if (item.isDirectory()) {
            continue;
        }
        const filePath = join(runtimeDir, item.name);
        fs.ensureDirectorySync(dirname(filePath));
        fs.writeFileSync(filePath, readFileSync(filePath, 'utf8'));
    }
}
