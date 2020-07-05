import { createMemoryFileSystemWithFiles } from '@stylable/e2e-test-kit';
import { create } from '@stylable/runtime';
import { stylableModuleFactory } from '../src';
import { Options } from '../src/module-factory';

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

export function moduleFactoryTestKit(
    files: Record<string, string>,
    options: Partial<Options> = {}
) {
    const fs = createMemoryFileSystemWithFiles(files);
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
