import type { LoaderDefinition } from 'webpack';
import type { StylableExports } from '@stylable/core';
import { generateStylableJSModuleSource } from '@stylable/module-utils';
import { addBuildInfo } from './add-build-info';

function evalStylableExtractModule(source: string): [string, StylableExports] {
    if (!source) {
        throw new Error('No source is provided to evalModule');
    }
    const _module = {
        exports: {},
    };
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(
        'module',
        'exports',
        'require',
        source.replace('export default ', 'module.exports = ')
    );
    fn(_module, _module.exports);
    return _module.exports as [string, StylableExports];
}

const stylableRuntimeLoader: LoaderDefinition = function loader(content) {
    if (typeof content !== 'string') {
        throw new Error('content is not string');
    }

    const [namespace, jsExports] = evalStylableExtractModule(content);

    addBuildInfo(this, namespace);
    return generateStylableJSModuleSource({
        namespace,
        jsExports,
        format: 'esm',
    });
};

export const loaderPath = __filename;
export default stylableRuntimeLoader;
