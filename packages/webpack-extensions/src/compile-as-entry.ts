import { Compilation, Compiler } from 'webpack';

const NativeModule = require('module');
const NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin');
const EntryPlugin = require('webpack/lib/EntryPlugin');
const LimitChunkCountPlugin = require('webpack/lib/optimize/LimitChunkCountPlugin');

export function compileAsEntry(
    compilation: Compilation,
    context: string,
    request: string,
    plugins: { apply(compiler: Compiler): void }[] = []
): Promise<string> {
    const pluginName = 'compileAsEntry';
    const outputOptions = {
        filename: '*',
    };
    const childCompiler = compilation.createChildCompiler(
        `${pluginName} ${request}`,
        outputOptions,
        []
    );

    new NodeTemplatePlugin(outputOptions).apply(childCompiler);
    new LibraryTemplatePlugin(null, 'commonjs2').apply(childCompiler);
    new NodeTargetPlugin().apply(childCompiler);
    new EntryPlugin(context, `!!${request}`, pluginName).apply(childCompiler);
    new LimitChunkCountPlugin({ maxChunks: 1 }).apply(childCompiler);
    plugins.forEach((p) => p.apply(childCompiler));

    let source: string;

    childCompiler.hooks.compilation.tap(pluginName, (compilation) => {
        compilation.hooks.afterProcessAssets.tap(pluginName, () => {
            source = compilation.assets['*'].source().toString();
            for (const chunk of compilation.chunks) {
                for (const file of chunk.files) {
                    compilation.deleteAsset(file);
                }
            }
        });
    });

    return new Promise((res, rej) => {
        childCompiler.runAsChild((err, _entries, compilation) => {
            if (err) {
                return rej(err);
            }

            if (compilation?.errors?.length) {
                return rej(compilation.errors[0]);
            }

            if (!source) {
                throw new Error('child compiler has no source output');
            }
            res(source);
        });
    });
}

export const exec = (code: string, filename: string, context: string) => {
    const module = new NativeModule(filename);
    module.paths = NativeModule._nodeModulePaths(context);
    module.filename = filename;
    module._compile(code, filename);
    return module.exports;
};
