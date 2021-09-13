import type { BuildOptions } from './build';
import { loadStylableConfig } from '@stylable/build-tools';

export type ConfigOptions = Omit<BuildOptions, 'watch'>;
export type PartialConfigOptions = Partial<ConfigOptions>;

/**
 * User's configuration method
 * @example
 * exports.stcConfig = () => ({
 *  options: {
 *      rootDir: './src'
 *  }
 * })
 */
export type Configuration = () => SingleProjectConfig;

export interface STCConfig {
    options: ConfigOptions;
}

interface SingleProjectConfig {
    options: PartialConfigOptions;
}

export function projectConfig(
    defaultOptions: ConfigOptions,
    cliOptions: PartialConfigOptions
): { options: STCConfig['options'] } {
    const optionsFromFile = resolveConfigFile(cliOptions.rootDir || defaultOptions.rootDir);
    const options: ConfigOptions = {
        ...defaultOptions,
        ...(optionsFromFile?.options || {}),
        ...cliOptions,
    };

    return {
        options,
    };
}

export function resolveConfigFile(context: string) {
    return loadStylableConfig(context, (config) => {
        return isSTCConfig(config) ? config.stcConfig() : undefined;
    });
}

function isSTCConfig(config: any): config is { stcConfig: Configuration } {
    return typeof config === 'object' && typeof config.stcConfig === 'function';
}
