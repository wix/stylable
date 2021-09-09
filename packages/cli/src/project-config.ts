import type { BuildOptions } from './build';
import { loadStylableConfig } from '@stylable/build-tools';

export type Options = Omit<BuildOptions, 'watch'>;
export type PartialOptions = Partial<Options>;

/**
 * User's configuration method
 * @example
 * const stcConfig = (defaults) => ({
 *  options: {
 *      ...defaults,
 *      rootDir: './src'
 *  }
 * })
 */
export type Configuration<T extends string> = (
    defaults: Options
) => SingleProjectConfig | MultiProjectsConfig<T>;

export interface STCConfig<T extends string> {
    presets: MultiProjectsConfig<T>['presets'];
    options: Options;
    projects: MultiProjectsConfig<T>['projects'];
}

interface SingleProjectConfig {
    options: PartialOptions;
}
interface MultiProjectsConfig<T extends string> {
    presets?: Record<T, PartialOptions>;
    options?: SingleProjectConfig['options'];
    projects:
        | Array<string>
        | Record<
              string,
              | Array<T>
              | T
              | PartialOptions
              | PartialOptions[]
              | { preset?: T; options?: PartialOptions; prepend?: boolean }
          >;
}

export function projectConfig<T extends string>(
    defaults: Options
): { options: STCConfig<T>['options'] } {
    let options: Options = { ...defaults };
    const optionsFromFile = findProjectConfig(process.cwd(), defaults);

    if (optionsFromFile?.options) {
        options = {
            ...options,
            ...optionsFromFile.options,
        };
    }

    return {
        options,
    };
}

export function findProjectConfig(context: string, defaults: Options) {
    return loadStylableConfig(context, (config) => {
        return isSTCConfig(config) ? config.stcConfig(defaults) : undefined;
    });
}

function isSTCConfig<T extends string>(config: any): config is { stcConfig: Configuration<T> } {
    return typeof config === 'object' && typeof config.stcConfig === 'function';
}
