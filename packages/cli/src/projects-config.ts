import type { BuildOptions } from './build';
import { loadStylableConfig } from '@stylable/build-tools';
import { CliArguments, resolveCliOptions, getDefaultOptions } from './resolve-options';

export type ConfigOptions = Omit<BuildOptions, 'watch' | 'rootDir' | 'stylable' | 'log' | 'fs'>;
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
    [projectRoot: string]: ConfigOptions;
}

interface SingleProjectConfig {
    options: PartialConfigOptions;
}

export function projectsConfig(argv: CliArguments): STCConfig {
    const projectRoot = argv.rootDir;
    const defaultOptions = getDefaultOptions();
    const optionsFromFile = resolveConfigFile(projectRoot);
    const cliOptions = resolveCliOptions(argv, defaultOptions);

    const topLevelOptions: ConfigOptions = {
        ...defaultOptions,
        ...(optionsFromFile?.options || {}),
        ...cliOptions,
    };

    return {
        [projectRoot]: topLevelOptions,
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
