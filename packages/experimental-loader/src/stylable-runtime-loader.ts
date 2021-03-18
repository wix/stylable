import { loader } from 'webpack';
import { StylableExports } from '@stylable/core';
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

    addBuildInfo(this, namespace);

    return createRuntimeTargetCode(namespace, mapping);
};

function addBuildInfo(ctx: loader.LoaderContext, namespace: string) {
    try {
        ctx._module.buildInfo.stylableNamespace = namespace;
    } catch (e) {
        ctx.emitWarning(
            `Failed to add stylableNamespace buildInfo for: ${ctx.resourcePath} because ${e.message}`
        );
    }
}

export const loaderPath = __filename;
export default stylableRuntimeLoader;
