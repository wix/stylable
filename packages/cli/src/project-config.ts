import type { BuildOptions } from './build';

type Options = Partial<BuildOptions>;

export interface STCConfig<T extends string> {
    presets: Record<T, Options>;
    projects: Record<string, Array<T> | T | Options | { preset: T; options: Options }>;
}

export interface ProjectConfigInput<T extends string, U extends T> {
    presets: STCConfig<T>['presets'];
    projects: STCConfig<U>['projects'];
}

export function projectConfig<T extends string, U extends T>(
    config: ProjectConfigInput<T, U>
): STCConfig<T> {
    return config;
}
