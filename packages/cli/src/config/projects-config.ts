import { loadStylableConfig } from '@stylable/build-tools';
import { resolveCliOptions, createDefaultOptions } from './resolve-options';
import { removeUndefined } from '../helpers';
import { resolve } from 'path';
import { tryRun } from '../build-tools';
import type {
    CliArguments,
    BuildOptions,
    Configuration,
    MultipleProjectsConfig,
    PartialBuildOptions,
    Presets,
    ProcessProjectsOptions,
    ProjectEntryValue,
    Projects,
    RawProjectEntity,
    ResolveProjectsContext,
    ResolveProjectsRequestsParams,
    STCConfig,
    ProjectsConfigResult,
} from '../types';
import { resolveNpmProjects } from './resolve-projects';

export function projectsConfig(argv: CliArguments): ProjectsConfigResult {
    const projectRoot = resolve(argv.rootDir);
    const defaultOptions = createDefaultOptions();
    const configFile = resolveConfigFile(projectRoot);
    const cliOptions = resolveCliOptions(argv, defaultOptions);
    const topLevelOptions = mergeBuildOptions(defaultOptions, configFile?.options, cliOptions);

    let projects: STCConfig;

    if (isMultpleConfigProject(configFile)) {
        const projectsEntities: RawProjectEntity[] = [];

        processProjects(configFile.projects, {
            onProjectEntry(entry) {
                projectsEntities.push(
                    resolveProjectEntry(entry, topLevelOptions, configFile.presets)
                );
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

function mergeBuildOptions(
    ...configs: [BuildOptions, ...(BuildOptions | PartialBuildOptions | undefined)[]]
): BuildOptions {
    const [config, ...rest] = configs;

    return Object.assign(
        {},
        config,
        ...rest.map((currentConfig) => (currentConfig ? removeUndefined(currentConfig) : {}))
    );
}

function processProjects(projects: Projects, { onProjectEntry }: ProcessProjectsOptions) {
    if (!Array.isArray(projects) && typeof projects !== 'object') {
        throw new Error('Invalid projects type');
    }

    if (Array.isArray(projects)) {
        for (const entry of projects) {
            onProjectEntry(typeof entry === 'string' ? [entry] : entry);
        }
    } else if (typeof projects === 'object') {
        for (const entry of Object.entries<ProjectEntryValue>(projects)) {
            onProjectEntry(entry);
        }
    }
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
    configOptions: BuildOptions,
    availablePresets: Presets = {}
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
                mergeBuildOptions(
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
): (BuildOptions | PartialBuildOptions)[] {
    return presetsNames.map((name) => {
        const preset = availablePresets[name];

        if (!preset) {
            throw new Error(`Cannot resolve preset named "${name}"`);
        }

        return preset;
    });
}
