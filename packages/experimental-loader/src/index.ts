import { LoaderOptions, loaderPath as transformLoaderPath } from './stylable-transform-loader';
import { loaderPath as runtimeLoaderPath } from './stylable-runtime-loader';

export const stylableLoaders = {
    transform: (options: Partial<LoaderOptions> = {}) => ({
        loader: transformLoaderPath,
        options,
    }),
    runtime: () => ({ loader: runtimeLoaderPath }),
};
