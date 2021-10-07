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
                        typeof entry === 'string' ? [entry] : entry,
                        topLevelOptions,
                        configFile.presets
                    )
                );
            }
        } else if (typeof configFile.projects === 'object') {
            for (const entry of Object.entries(configFile.projects)) {
                projects.push(resolveProjectEntry(entry, topLevelOptions, configFile.presets));
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
    [request, value]: [string, ProjectEntryValue] | [string],
    configOptions: ConfigOptions,
    availablePresets: MultipleProjectsConfig['presets']
): RawProjectEntity {
    if (!value) {
        value = { options: {} };
    }

    if (typeof value === 'string') {
        value = {
            preset: value,
            options: {},
        };
    }

    if (Array.isArray(value)) {
        value = {
            presets: [...value],
            options: {},
        };
    }

    if (typeof value.preset === 'string') {
        value = {
            ...value,
            presets: [...(value.presets || []), value.preset],
        };
    }

    if (!Array.isArray(value.presets)) {
        value.presets = [];
    }

    const { options, presets } = value;

    return {
        request: request.trim(),
        options: (Array.isArray(options) ? options : [options])
            .slice()
            .map((option) =>
                mergeProjectsConfigs(
                    configOptions,
                    ...resolvePresets(presets, availablePresets),
                    option
                )
            ),
    };
}

function resolvePresets(
    presetsNames: string[],
    availablePresets: MultipleProjectsConfig['presets'] = {}
): (ConfigOptions | PartialConfigOptions)[] {
    return presetsNames.map((name) => {
        const preset = availablePresets[name];

        if (!preset) {
            throw new Error(`Cannot resolve preset named "${name}"`);
        }

        return preset;
    });
}
