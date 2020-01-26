import webpack from 'webpack';

const NativeModule = require('module');
const NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin');
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');
const LimitChunkCountPlugin = require('webpack/lib/optimize/LimitChunkCountPlugin');

export function compileAsEntry(
    compilation: any,
    context: string,
    request: string
): Promise<string> {
    const pluginName = 'compileAsEntry';
    const outputOptions = {
        filename: '*'
    };
    const childCompiler = compilation.createChildCompiler(
        `${'pluginName'} ${request}`,
        outputOptions
    );
    new NodeTemplatePlugin(outputOptions).apply(childCompiler);
    new LibraryTemplatePlugin(null, 'commonjs2').apply(childCompiler);
    new NodeTargetPlugin().apply(childCompiler);
    new SingleEntryPlugin(context, request, pluginName).apply(childCompiler);
    new LimitChunkCountPlugin({ maxChunks: 1 }).apply(childCompiler);
    let source: string;
    childCompiler.hooks.afterCompile.tap(
        pluginName,
        (compilation: webpack.compilation.Compilation) => {
            source = compilation.assets['*'] && compilation.assets['*'].source();
            // Remove all chunk assets
            compilation.chunks.forEach(chunk => {
                chunk.files.forEach((file: string) => {
                    delete compilation.assets[file]; // eslint-disable-line no-param-reassign
                });
            });
        }
    );

    return new Promise((res, rej) => {
        childCompiler.runAsChild(
            (
                err: Error,
                _entries: webpack.compilation.Chunk[],
                compilation: webpack.compilation.Compilation
            ) => {
                if (err) {
                    return rej(err);
                }

                if (compilation.errors.length > 0) {
                    return rej(compilation.errors[0]);
                }

                if (!source) {
                    throw new Error('');
                }
                res(source);
            }
        );
    });
}

export const exec = (code: string, filename: string, context: string) => {
    const module = new NativeModule(filename);
    module.paths = NativeModule._nodeModulePaths(context);
    module.filename = filename;
    module._compile(code, filename);
    return module.exports;
};
