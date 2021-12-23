import { loadStylableConfig } from '@stylable/build-tools';
import { resolve } from 'path';
import { tryRun } from '../build-tools';
import type {
    CliArguments,
    Configuration,
    ConfigurationProvider,
    MultipleProjectsConfig,
    RawProjectEntity,
    ResolveProjectsContext,
    ResolveRequests,
    STCConfig,
} from '../types';
import { processProjects } from './process-projects';
import {
    createDefaultOptions,
    mergeBuildOptions,
    resolveCliOptions,
    validateOptions,
} from './resolve-options';
import { resolveNpmRequests } from './resolve-requests';

export async function projectsConfig(argv: CliArguments): Promise<{
    rootDir: string;
    projects: STCConfig;
}> {
    const projectRoot = resolve(argv.rootDir);
    const defaultOptions = createDefaultOptions();
    const configFile = resolveConfigFile(projectRoot);
    const cliOptions = resolveCliOptions(argv, defaultOptions);
    const topLevelOptions = mergeBuildOptions(defaultOptions, configFile?.options, cliOptions);

    validateOptions(topLevelOptions);

    let projects: STCConfig;

    if (isMultpleConfigProject(configFile)) {
        const { entities } = processProjects(configFile, {
            defaultOptions: topLevelOptions,
        });

        projects = await resolveProjectsRequests({
            projectRoot,
            entities,
            resolveRequests: configFile.projectsOptions?.resolveRequests ?? resolveNpmRequests,
        });
    } else {
        projects = [
            {
                projectRoot,
                options: [topLevelOptions],
            },
        ];
    }

    return {
        rootDir: projectRoot,
        projects,
    };
}

export function resolveConfigFile(context: string) {
    return loadStylableConfig(context, (config) =>
        tryRun(
            () =>
                isSTCConfig(config)
                    ? typeof config.stcConfig === 'function'
                        ? config.stcConfig()
                        : config.stcConfig
                    : undefined,
            'Failed to evaluate "stcConfig"'
        )
    );
}

function isSTCConfig(config: any): config is { stcConfig: Configuration | ConfigurationProvider } {
    return (
        typeof config === 'object' &&
        config.stcConfig &&
        (typeof config.stcConfig === 'function' || typeof config.stcConfig === 'object')
    );
}

function isMultpleConfigProject(config: any): config is MultipleProjectsConfig<string> {
    return Boolean(config?.projects);
}

async function resolveProjectsRequests({
    entities,
    projectRoot,
    resolveRequests,
}: {
    projectRoot: string;
    entities: Array<RawProjectEntity>;
    resolveRequests: ResolveRequests;
}): Promise<STCConfig> {
    const context: ResolveProjectsContext = { projectRoot };

    return resolveRequests(entities, context);
}
