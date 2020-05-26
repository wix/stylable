import { StylableModule } from './types';

export function isLoadedByLoaders(module: StylableModule, warn: (m: StylableModule) => void) {
    let isSupportedLoader = false;
    if (module.loaders.length === 0) {
        return false;
    }
    try {
        const loaderPath = module.loaders[0].loader
        isSupportedLoader =
            module.loaders.length === 1 &&
            (
                (loaderPath.includes('stylable-') && loaderPath.includes('-loader')) ||
                loaderPath === require.resolve('raw-loader')
            );
    } catch {
        /* */
    }
    if (!isSupportedLoader) {
        warn(module);
    }
    module.type = 'stylable-raw';
    return true;
}
