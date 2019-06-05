import { createMemoryFileSystemWithFiles } from '@stylable/e2e-test-kit';
import { create } from '@stylable/runtime';
import { create as legacyCreate } from '@stylable/runtime/src/index-legacy';
import { stylableModuleFactory } from '../src';
import { Options } from '../src/module-factory';

function evalModule(id: string, source: string, requireModule: (s: string) => any) {
    const _module = {
        id,
        exports: {}
    };

    const fn = new Function('module', 'exports', 'require', source);
    fn(_module, _module.exports, requireModule);

    return _module.exports;
}

export function evalStylableModule<T = unknown>(source: string, fullPath: string): T {
    return evalModule(fullPath, source, id => {
        if (id === '@stylable/runtime') {
            return { create };
        }
        if (id === '@stylable/runtime/cjs/index-legacy.js') {
            return { create: legacyCreate };
        }
        throw new Error(`Could not find module: ${id}`);
    }) as T;
}

export function moduleFactoryTestKit(
    files: Record<string, string>,
    options: Partial<Options> = {}
) {
    const fs = createMemoryFileSystemWithFiles(files);
    const factory = stylableModuleFactory(
        {
            resolveNamespace: namespace => namespace,
            fileSystem: fs,
            projectRoot: '/'
        },
        options
    );

    return {
        fs,
        factory,
        evalStylableModule
    };
}
