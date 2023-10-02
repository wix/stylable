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
import type { ModuleResolver } from '@stylable/core/dist/index-internal';
import type { processNamespace } from '@stylable/core';
import type { IFileSystem } from '@file-services/types';

interface StylableRuntimeConfigs {
    stcConfig?: Configuration<string> | undefined;
    defaultConfig?: {
        resolveModule?: ModuleResolver;
        resolveNamespace?: typeof processNamespace;
    };
}

export async function projectsConfig(
    rootDir: string,
    overrideBuildOptions: Partial<BuildOptions>,
    defaultOptions: BuildOptions = createDefaultOptions(),
    config?: StylableRuntimeConfigs
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
