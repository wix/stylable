import type { Compilation, Compiler, NormalModule } from 'webpack';
import { replaceMappedCSSAssetPlaceholders, getStylableBuildData } from './plugin-utils';

const memoize = require('webpack/lib/util/memoize');

import { StylableWebpackPlugin } from './plugin';
import { BuildData } from './types';

const getMiniCssExtractPlugin = memoize(() => {
    return require('mini-css-extract-plugin');
});
export function injectCssModules(
    webpack: Compiler['webpack'],
    compilation: Compilation,
    staticPublicPath: string,
    stylableModules: Map<NormalModule, BuildData | null>,
    assetsModules: Map<string, NormalModule>
) {
    const MiniCssExtractPlugin = getMiniCssExtractPlugin();
    const CssModule = MiniCssExtractPlugin.getCssModule(webpack);

    compilation.hooks.afterChunks.tap(StylableWebpackPlugin.name, () => {
        const { moduleGraph, dependencyTemplates, runtimeTemplate } = compilation;
        const chunkGraph = compilation.chunkGraph!;

        for (const [module] of stylableModules) {
            const cssModule = new CssModule({
                context: module.context,
                identifier: module.resource.replace(/\.st\.css$/, '.css') + '?stylable-css-inject',
                identifierIndex: 1,
                content: replaceMappedCSSAssetPlaceholders({
                    assetsModules,
                    staticPublicPath,
                    chunkGraph,
                    moduleGraph,
                    dependencyTemplates,
                    runtime: 'CSS' /*runtime*/,
                    runtimeTemplate,
                    stylableBuildData: getStylableBuildData(stylableModules, module),
                }),
                media: '',
                sourceMap: null,
            });
            cssModule.build(undefined, undefined, undefined, undefined, () => {
                /** We use the void build method just to ensure that the module have buildMeta and buildInfo */
            });

            compilation.modules.add(cssModule);
            for (const chunk of chunkGraph.getModuleChunksIterable(module)) {
                const [chunkGroup] = chunk.groupsIterable;
                chunkGraph.connectChunkAndModule(chunk, cssModule);
                chunkGroup.setModulePostOrderIndex(cssModule, module.buildMeta.stylable.depth);
            }
        }
    });
}

export function injectCSSOptimizationRules(compiler: Compiler) {
    const CssModule = getMiniCssExtractPlugin().getCssModule(compiler.webpack);
    if (!compiler.options.optimization) {
        compiler.options.optimization = {};
    }
    if (!compiler.options.optimization.splitChunks) {
        compiler.options.optimization.splitChunks = {};
    }
    if (!compiler.options.optimization.splitChunks.cacheGroups) {
        compiler.options.optimization.splitChunks.cacheGroups = {};
    }
    if (compiler.options.optimization.splitChunks.cacheGroups.stylable === undefined) {
        compiler.options.optimization.splitChunks.cacheGroups.stylable = {
            name: 'stylable',
            test: (module) => {
                return module.constructor.name === CssModule.name;
            },
            chunks: 'all',
            enforce: true,
        };
    }
}
