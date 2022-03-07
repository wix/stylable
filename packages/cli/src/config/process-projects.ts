import type {
    BuildOptions,
    MultipleProjectsConfig,
    PartialBuildOptions,
    Presets,
    ProjectEntryValue,
    ProjectEntryValues,
    RawProjectEntity,
} from '../types';
import { createDefaultOptions, mergeBuildOptions, validateOptions } from './resolve-options';

interface ProcessProjectsOptions {
    defaultOptions?: BuildOptions;
}

export function processProjects<P extends string>(
    { projects, presets }: MultipleProjectsConfig<P>,
    { defaultOptions = createDefaultOptions() }: ProcessProjectsOptions = {}
) {
    const entities: RawProjectEntity[] = [];
    if (!Array.isArray(projects) && typeof projects !== 'object') {
        throw new Error('Invalid projects type');
    }

    if (Array.isArray(projects)) {
        for (const entry of projects) {
            entities.push(
                resolveProjectEntry(
                    typeof entry === 'string' ? [entry] : entry,
                    defaultOptions,
                    presets
                )
            );
        }
    } else if (typeof projects === 'object') {
        for (const entry of Object.entries(projects)) {
            entities.push(resolveProjectEntry(entry, defaultOptions, presets));
        }
    }

    return {
        entities,
    };
}

function resolveProjectEntry<P extends string>(
    [request, value]: [string, ProjectEntryValues<P>] | [string],
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

    request = request.trim();
    return {
        request,
        options: totalOptions.map((options, i, { length }) => {
            const mergedOptions = mergeBuildOptions(configOptions, options);

            validateOptions(mergedOptions, length > 1 ? `[${i}] ${request}` : request);

            return mergedOptions;
        }),
    };

    function normalizeEntry(entryValue: ProjectEntryValue<P>) {
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
    availablePresets: NonNullable<MultipleProjectsConfig<string>['presets']>
): BuildOptions | PartialBuildOptions {
    const preset = availablePresets[presetName];

    if (!preset || typeof presetName !== 'string') {
        throw new Error(`Cannot resolve preset named "${presetName}"`);
    }

    return preset;
}
