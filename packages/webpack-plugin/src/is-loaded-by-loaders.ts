import { StylableModule } from './types';

export function isLoadedByLoaders(module: StylableModule, warn: (m: StylableModule) => void) {
    let isRawOnly = false;
    if (module.loaders.length === 0) {
        return false;
    }
    try {
        isRawOnly =
            module.loaders.length === 1 &&
            module.loaders[0].loader === require.resolve('raw-loader');
    } catch {
        /* */
    }
    if (!isRawOnly) {
        warn(module);
    }
    module.type = 'stylable-raw';
    return true;
}
