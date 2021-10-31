import { loadStylableConfig } from '@stylable/build-tools';
import { resolve } from 'path';
import { tryRun } from '../build-tools';
import type {
    CliArguments,
    Configuration,
    MultipleProjectsConfig,
    ProjectsConfigResult,
    ResolveProjectsContext,
    ResolveProjectsRequestsParams,
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

export async function projectsConfig(argv: CliArguments): Promise<ProjectsConfigResult> {
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
            () => (isSTCConfig(config) ? config.stcConfig() : undefined),
            'Failed to evaluate "stcConfig"'
        )
    );
}

function isSTCConfig(config: any): config is { stcConfig: Configuration } {
    return typeof config === 'object' && typeof config.stcConfig === 'function';
}

function isMultpleConfigProject(config: any): config is MultipleProjectsConfig {
    return Boolean(config?.projects);
}

async function resolveProjectsRequests({
    entities,
    projectRoot,
    resolveRequests,
}: ResolveProjectsRequestsParams): Promise<STCConfig> {
    const context: ResolveProjectsContext = { projectRoot };

    return resolveRequests(entities, context);
}
