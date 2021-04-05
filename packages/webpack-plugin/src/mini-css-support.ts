import type { Compilation, Compiler, NormalModule } from 'webpack';
import { replaceMappedCSSAssetPlaceholders, getStylableBuildData } from './plugin-utils';

import { StylableWebpackPlugin } from './plugin';
import { BuildData } from './types';

export function injectCssModules(
    webpack: Compiler['webpack'],
    compilation: Compilation,
    staticPublicPath: string,
    stylableModules: Map<NormalModule, BuildData | null>,
    assetsModules: Map<string, NormalModule>
) {
    const MiniCssExtractPlugin = compilation.options.plugins.find(
        (plugin) => plugin.constructor.name === 'MiniCssExtractPlugin'
    );

    if (!MiniCssExtractPlugin) {
        throw new Error(
            'StylableWebpackPlugin cannot find "MiniCssExtractPlugin" in the compilation plugin list'
        );
    }

    const CssModule = (MiniCssExtractPlugin.constructor as typeof import('mini-css-extract-plugin')).getCssModule(
        webpack
    );

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

            compilation.modules.add(cssModule);
            for (const chunk of chunkGraph.getModuleChunksIterable(module)) {
                const [chunkGroup] = chunk.groupsIterable;
                chunkGraph.connectChunkAndModule(chunk, cssModule);
                chunkGroup.setModulePostOrderIndex(cssModule, module.buildMeta.stylable.depth);
            }
        }
    });
}
