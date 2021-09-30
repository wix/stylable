import type { BuildOptions } from './build';
import { loadStylableConfig } from '@stylable/build-tools';
import { CliArguments, resolveCliOptions, createDefaultOptions } from './resolve-options';
import { removeUndefined } from './helpers';
import { resolve } from 'path';

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
    [absoluteProjectRoot: string]: ConfigOptions;
}

interface SingleProjectConfig {
    options: PartialConfigOptions;
}

export function projectsConfig(argv: CliArguments): STCConfig {
    const projectRoot = resolve(argv.rootDir);
    const defaultOptions = createDefaultOptions();
    const configFile = resolveConfigFile(projectRoot);
    const cliOptions = resolveCliOptions(argv, defaultOptions);
    const topLevelOptions = mergeProjectsConfigs(defaultOptions, configFile?.options, cliOptions);

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

function mergeProjectsConfigs(
    ...configs: [ConfigOptions, ...(ConfigOptions | PartialConfigOptions | undefined)[]]
): ConfigOptions {
    const [config, ...rest] = configs;

    return Object.assign(
        config,
        ...rest.map((currentConfig) => (currentConfig ? removeUndefined(currentConfig) : {}))
    );
}
