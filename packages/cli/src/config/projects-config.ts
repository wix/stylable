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
    const totalOptions: Array<BuildOptions | PartialBuildOptions> = [];

    if (!value) {
        totalOptions.push({ ...configOptions });
    } else if (Array.isArray(value)) {
        for (const valueEntry of value) {
            totalOptions.push(...normalizeEntry(valueEntry));
        }
    } else {
        totalOptions.push(...normalizeEntry(value));
    }

    return {
        request: request.trim(),
        options: totalOptions.map((options) => mergeBuildOptions(configOptions, options)),
    };

    function normalizeEntry(entryValue: Exclude<ProjectEntryValue, Array<any>>) {
        if (typeof entryValue === 'string') {
            return [resolvePreset(entryValue, availablePresets)];
        } else if (typeof entryValue === 'object') {
            if ('options' in entryValue) {
                const currentPresets = entryValue.presets || [];

                if (typeof entryValue.preset === 'string') {
                    currentPresets.push(entryValue.preset);
                }

                return currentPresets.map((presetName) =>
                    mergeBuildOptions(
                        configOptions,
                        resolvePreset(presetName, availablePresets),
                        entryValue.options || {}
                    )
                );
            } else {
                return [entryValue];
            }
        } else {
            throw new Error(`Cannot resolve entry "${entryValue}"`);
        }
    }
}

function resolvePreset(
    presetName: string,
    availablePresets: NonNullable<MultipleProjectsConfig['presets']>
): BuildOptions | PartialBuildOptions {
    const preset = availablePresets[presetName];

    if (!preset || typeof presetName !== 'string') {
        throw new Error(`Cannot resolve preset named "${presetName}"`);
    }

    return preset;
}
