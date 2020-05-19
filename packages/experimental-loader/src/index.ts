import { LoaderOptions } from './stylable-transform-loader';

export const stylableLoaders = {
    transform: (options: Partial<LoaderOptions> = {}) => ({
        loader: require.resolve('./stylable-transform-loader.ts'),
        options,
    }),
    runtime: () => ({ loader: require.resolve('./stylable-runtime-loader.ts') }),
};
