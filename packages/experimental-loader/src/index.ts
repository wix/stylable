import { LoaderOptions, loaderPath as transformLoaderPath } from './stylable-transform-loader.js';
import { loaderPath as runtimeLoaderPath } from './stylable-runtime-loader.js';

export const stylableLoaders = {
    transform: (options: Partial<LoaderOptions> = {}) => ({
        loader: transformLoaderPath,
        options,
    }),
    runtime: () => ({ loader: runtimeLoaderPath }),
};
