import { createMemoryFileSystemWithFiles } from '@stylable/e2e-test-kit';
import { create } from '@stylable/runtime';
import { stylableModuleFactory } from '../src';

function evalModule(id: string, source: string, requireModule: (s: string) => any) {
    const _module = {
        id,
        exports: {}
    };

    const fn = new Function('module', 'exports', 'require', source);
    fn(_module, _module.exports, requireModule);

    return _module.exports;
}

export function moduleFactoryTestKit(files: Record<string, string>) {
    const fs = createMemoryFileSystemWithFiles(files);
    const factory = stylableModuleFactory({
        resolveNamespace: namespace => namespace,
        fileSystem: fs,
        projectRoot: '/'
    });

    function evalStylableModule(source: string, fullPath: string) {
        return evalModule(fullPath, source, id => {
            if (id === '@stylable/runtime') {
                return { create };
            }
            throw new Error(`Could not find module: ${id}`);
        });
    }

    return {
        fs,
        factory,
        evalStylableModule
    };
}
