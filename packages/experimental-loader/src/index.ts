import { LoaderOptions } from './stylable-loader-transform';

export const stylableLoaders = {
    transform: (options: Partial<LoaderOptions> = {}) => ({
        loader: require.resolve('./stylable-loader-transform.ts'),
        options,
    }),
    runtime: () => ({ loader: require.resolve('./stylable-runtime-loader.ts') }),
};
