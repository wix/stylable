import { loadStylableConfig } from '@stylable/build-tools';
import { resolve } from 'path';
import { tryRun } from '../build-tools';
import type {
    CliArguments,
    Configuration,
    MultipleProjectsConfig,
    ProjectsConfigResult,
    RawProjectEntity,
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
import { resolveNpmProjects } from './resolve-projects';

export function projectsConfig(argv: CliArguments): ProjectsConfigResult {
    const projectRoot = resolve(argv.rootDir);
    const defaultOptions = createDefaultOptions();
    const configFile = resolveConfigFile(projectRoot);
    const cliOptions = resolveCliOptions(argv, defaultOptions);
    const topLevelOptions = mergeBuildOptions(defaultOptions, configFile?.options, cliOptions);

    validateOptions(topLevelOptions);

    let projects: STCConfig;

    if (isMultpleConfigProject(configFile)) {
        const projectsEntities: RawProjectEntity[] = [];

        processProjects(configFile, {
            defaultOptions: topLevelOptions,
            onProjectEntity(entity) {
                projectsEntities.push(entity);
            },
        });

        projects = resolveProjectsRequests({
            projectRoot,
            projects: projectsEntities,
            resolveProjects: configFile.resolveProjects || resolveNpmProjects,
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

function resolveProjectsRequests({
    projects,
    projectRoot,
    resolveProjects,
}: ResolveProjectsRequestsParams): STCConfig {
    const context: ResolveProjectsContext = { projectRoot };

    return resolveProjects(projects, context);
}
