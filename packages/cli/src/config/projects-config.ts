import { loadStylableConfig } from '@stylable/build-tools';
import type { BuildOptions } from '../types.js';
import { tryRun } from '../build-tools.js';
import type {
    Configuration,
    ConfigurationProvider,
    MultipleProjectsConfig,
    RawProjectEntity,
    ResolveProjectsContext,
    ResolveRequests,
    STCProjects,
} from '../types.js';
import { processProjects } from './process-projects.js';
import { createDefaultOptions, mergeBuildOptions, validateOptions } from './resolve-options.js';
import { resolveNpmRequests } from './resolve-requests.js';
import type { StylableConfig } from '@stylable/core';
import type { IFileSystem } from '@file-services/types';

export interface StylableRuntimeConfigs {
    stcConfig?: Configuration<string> | undefined;
    defaultConfig?: Pick<
        StylableConfig,
        | 'resolveNamespace'
        | 'requireModule'
        | 'resolveModule'
        | 'flags'
        | 'experimentalSelectorInference'
    >;
}

export function projectsConfig(
    rootDir: string,
    overrideBuildOptions: Partial<BuildOptions>,
    defaultOptions: BuildOptions = createDefaultOptions(),
    config?: StylableRuntimeConfigs,
): STCProjects {
    const topLevelOptions = mergeBuildOptions(
        defaultOptions,
        config?.stcConfig?.options,
        overrideBuildOptions,
    );

    validateOptions(topLevelOptions);

    return isMultipleConfigProject(config)
        ? resolveProjectsRequests({
              rootDir,
              entities: processProjects(config.stcConfig, {
                  defaultOptions: topLevelOptions,
              }).entities,
              resolveRequests:
                  config.stcConfig.projectsOptions?.resolveRequests ?? resolveNpmRequests,
          })
        : [
              {
                  projectRoot: rootDir,
                  options: [topLevelOptions],
              },
          ];
}

export function resolveConfig(context: string, fs: IFileSystem, request?: string) {
    return request ? requireConfigFile(request, context, fs) : resolveConfigFile(context, fs);
}

function requireConfigFile(request: string, context: string, fs?: IFileSystem) {
    const path = require.resolve(request, { paths: [context] });
    const config = resolveConfigValue(require(path), fs);
    return config ? { config, path } : undefined;
}

function resolveConfigFile(context: string, fs?: IFileSystem) {
    return loadStylableConfig(context, (config) => resolveConfigValue(config, fs));
}

function resolveConfigValue(config: any, fs?: IFileSystem) {
    return tryRun(
        (): StylableRuntimeConfigs => ({
            stcConfig: isSTCConfig(config)
                ? typeof config.stcConfig === 'function'
                    ? config.stcConfig()
                    : config.stcConfig
                : undefined,
            defaultConfig:
                typeof config.defaultConfig === 'function' ? config.defaultConfig(fs) : undefined,
        }),
        'Failed to evaluate Stylable config',
    );
}

function isSTCConfig(config: any): config is { stcConfig: Configuration | ConfigurationProvider } {
    return (
        typeof config === 'object' &&
        config.stcConfig &&
        (typeof config.stcConfig === 'function' || typeof config.stcConfig === 'object')
    );
}

function isMultipleConfigProject(
    config: any,
): config is { stcConfig: MultipleProjectsConfig<string> } {
    return Boolean(config?.stcConfig?.projects);
}

function resolveProjectsRequests({
    entities,
    rootDir,
    resolveRequests,
}: {
    rootDir: string;
    entities: Array<RawProjectEntity>;
    resolveRequests: ResolveRequests;
}): STCProjects {
    const context: ResolveProjectsContext = { rootDir };

    return resolveRequests(entities, context);
}
