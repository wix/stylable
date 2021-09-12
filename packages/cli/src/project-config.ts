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
export type Configuration<T extends string> = () => SingleProjectConfig | MultiProjectsConfig<T>;

export interface STCConfig<T extends string> {
    presets: MultiProjectsConfig<T>['presets'];
    options: ConfigOptions;
    projects: MultiProjectsConfig<T>['projects'];
}

interface SingleProjectConfig {
    options: PartialConfigOptions;
}
interface MultiProjectsConfig<T extends string> {
    presets?: Record<T, PartialConfigOptions>;
    options?: SingleProjectConfig['options'];
    projects:
        | Array<string>
        | Record<
              string,
              | Array<T>
              | T
              | PartialConfigOptions
              | PartialConfigOptions[]
              | { preset?: T; options?: PartialConfigOptions; prepend?: boolean }
          >;
}

export function projectConfig<T extends string>(
    defaultOptions: ConfigOptions,
    cliOptions: PartialConfigOptions
): { options: STCConfig<T>['options'] } {
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

function isSTCConfig<T extends string>(config: any): config is { stcConfig: Configuration<T> } {
    return typeof config === 'object' && typeof config.stcConfig === 'function';
}
