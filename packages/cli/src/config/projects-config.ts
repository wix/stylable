import { loadStylableConfig } from '@stylable/build-tools';
import { resolveCliOptions, createDefaultOptions } from './resolve-options';
import { removeUndefined } from '../helpers';
import { resolve } from 'path';
import { tryRun } from '../build-tools';
import type {
    CliArguments,
    ConfigOptions,
    Configuration,
    MultipleProjectsConfig,
    PartialConfigOptions,
    ProjectEntryValue,
    RawProjectEntity,
    ResolveProjectsContext,
    ResolveProjectsRequestsParams,
    STCConfig,
} from './types';
import { resolveNpmProjects } from './resolve-projects';

export function projectsConfig(argv: CliArguments): STCConfig {
    const projectRoot = resolve(argv.rootDir);
    const defaultOptions = createDefaultOptions();
    const configFile = resolveConfigFile(projectRoot);
    const cliOptions = resolveCliOptions(argv, defaultOptions);
    const topLevelOptions = mergeProjectsConfigs(defaultOptions, configFile?.options, cliOptions);

    if (isMultpleConfigProject(configFile)) {
        const projects: RawProjectEntity[] = [];

        if (Array.isArray(configFile.projects)) {
            for (const entry of configFile.projects) {
                projects.push(
                    resolveProjectEntry(
                        typeof entry === 'string' ? [entry, { options: {} }] : entry,
                        topLevelOptions
                    )
                );
            }
        } else if (typeof configFile.projects === 'object') {
            for (const entry of Object.entries(configFile.projects)) {
                projects.push(resolveProjectEntry(entry, topLevelOptions));
            }
        }

        return resolveProjectsRequests({
            projectRoot,
            projects,
            resolveProjects: configFile.resolveProjects || resolveNpmProjects,
        });
    } else {
        return [
            {
                projectRoot,
                options: [topLevelOptions],
            },
        ];
    }
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

function mergeProjectsConfigs(
    ...configs: [ConfigOptions, ...(ConfigOptions | PartialConfigOptions | undefined)[]]
): ConfigOptions {
    const [config, ...rest] = configs;

    return Object.assign(
        {},
        config,
        ...rest.map((currentConfig) => (currentConfig ? removeUndefined(currentConfig) : {}))
    );
}

function resolveProjectsRequests({
    projects,
    projectRoot,
    resolveProjects,
}: ResolveProjectsRequestsParams): STCConfig {
    const context: ResolveProjectsContext = { projectRoot };

    return resolveProjects(projects, context);
}

function resolveProjectEntry(
    [request, { options }]: [string, ProjectEntryValue],
    configOptions: ConfigOptions
): RawProjectEntity {
    return {
        request: request.trim(),
        options: (Array.isArray(options) ? options : [options])
            .slice()
            .map((option) => mergeProjectsConfigs(configOptions, option)),
    };
}
