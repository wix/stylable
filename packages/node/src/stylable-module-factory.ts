import { Stylable, StylableConfig } from '@stylable/core';
import { generateModuleSource } from './stylable-module-source';

export function stylableModuleFactory(stylableOptions: StylableConfig) {
    const stylable = Stylable.create(stylableOptions);

    return function stylableToModule(source: string, path: string) {
        return generateModuleSource(stylable.transform(source, path), true);
    };
}
