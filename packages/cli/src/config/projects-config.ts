import { loadStylableConfig } from '@stylable/build-tools';
import type { BuildOptions } from '../types';
import { tryRun } from '../build-tools';
import type {
    Configuration,
    ConfigurationProvider,
    MultipleProjectsConfig,
    RawProjectEntity,
    ResolveProjectsContext,
    ResolveRequests,
    STCProjects,
} from '../types';
import { processProjects } from './process-projects';
import { createDefaultOptions, mergeBuildOptions, validateOptions } from './resolve-options';
import { resolveNpmRequests } from './resolve-requests';
import type { ModuleResolver } from '@stylable/core/src/types';
import type { MinimalFS } from '@stylable/core';

interface StylableCliConfigs {
    stcConfig: Configuration<string> | undefined;
    createResolver: ((fs: MinimalFS) => ModuleResolver) | undefined;
}

export async function projectsConfig(
    rootDir: string,
    overrideBuildOptions: Partial<BuildOptions>,
    defaultOptions: BuildOptions = createDefaultOptions(),
    config?: StylableCliConfigs
): Promise<STCProjects> {
    const topLevelOptions = mergeBuildOptions(
        defaultOptions,
        config?.stcConfig?.options,
        overrideBuildOptions
    );

    validateOptions(topLevelOptions);

    let projects: STCProjects;

    if (isMultipleConfigProject(config)) {
        const { entities } = processProjects(config.stcConfig, {
            defaultOptions: topLevelOptions,
        });

        projects = await resolveProjectsRequests({
            rootDir,
            entities,
            resolveRequests:
                config.stcConfig.projectsOptions?.resolveRequests ?? resolveNpmRequests,
        });
    } else {
        projects = [
            {
                projectRoot: rootDir,
                options: [topLevelOptions],
            },
        ];
    }

    return projects;
}

export function resolveConfig(context: string, request?: string) {
    return request ? requireConfigFile(request, context) : resolveConfigFile(context);
}

function requireConfigFile(request: string, context: string) {
    const path = require.resolve(request, { paths: [context] });
    const config = resolveConfigValue(require(path));
    return config ? { config, path } : undefined;
}

function resolveConfigFile(context: string) {
    return loadStylableConfig(context, (config) => resolveConfigValue(config));
}

function resolveConfigValue(config: any) {
    return tryRun(
        () => ({
            stcConfig: isSTCConfig(config)
                ? typeof config.stcConfig === 'function'
                    ? config.stcConfig()
                    : config.stcConfig
                : undefined,
            createResolver: isResolverConfig(config) ? config.createResolver : undefined,
        }),
        'Failed to evaluate Stylable config'
    );
}

function isSTCConfig(config: any): config is { stcConfig: Configuration | ConfigurationProvider } {
    return (
        typeof config === 'object' &&
        config.stcConfig &&
        (typeof config.stcConfig === 'function' || typeof config.stcConfig === 'object')
    );
}

function isResolverConfig(
    config: any
): config is { createResolver: (fs: MinimalFS) => ModuleResolver } {
    return (
        typeof config === 'object' &&
        config.createResolver &&
        typeof config.createResolver === 'function'
    );
}

function isMultipleConfigProject(
    config: any
): config is { stcConfig: MultipleProjectsConfig<string> } {
    return Boolean(config?.stcConfig?.projects);
}

async function resolveProjectsRequests({
    entities,
    rootDir,
    resolveRequests,
}: {
    rootDir: string;
    entities: Array<RawProjectEntity>;
    resolveRequests: ResolveRequests;
}): Promise<STCProjects> {
    const context: ResolveProjectsContext = { rootDir };

    return resolveRequests(entities, context);
}
