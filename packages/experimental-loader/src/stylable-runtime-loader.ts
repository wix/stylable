import type { loader } from 'webpack';
import type { StylableExports } from '@stylable/core';
import { createRuntimeTargetCode } from './create-runtime-target-code';

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

const stylableRuntimeLoader: loader.Loader = function loader(content) {
    if (typeof content !== 'string') {
        throw new Error('content is not string');
    }

    const [namespace, mapping] = evalStylableExtractModule(content);

    return createRuntimeTargetCode(namespace, mapping);
};

export const loaderPath = __filename;
export default stylableRuntimeLoader;
