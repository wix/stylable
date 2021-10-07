import type { BuildOptions } from '../build';

export type ConfigOptions = Omit<BuildOptions, 'watch' | 'rootDir' | 'stylable' | 'log' | 'fs'>;
export type PartialConfigOptions = Partial<ConfigOptions>;

/**
 * User's configuration method
 * @example
 * exports.stcConfig = () => ({
 *  options: {
 *      rootDir: './src'
 *  }
 * })
 */
export type Configuration = () => SingleProjectConfig | MultipleProjectsConfig;

interface BaseProjectEntity {
    options: ConfigOptions[];
}

export interface ProjectEntity extends BaseProjectEntity {
    projectRoot: string;
}
export interface RawProjectEntity extends BaseProjectEntity {
    request: string;
}

export type STCConfig = ProjectEntity[];
export type ResolveProjects = (
    projects: Array<RawProjectEntity>,
    context: ResolveProjectsContext
) => STCConfig;

export interface ResolveProjectsContext {
    projectRoot: string;
}

export interface ResolveProjectsRequestsParams {
    projectRoot: string;
    projects: Array<RawProjectEntity>;
    resolveProjects: ResolveProjects;
}

export interface SingleProjectConfig {
    options: PartialConfigOptions;
}

export type Presets = Record<string, PartialConfigOptions>;

export type Projects =
    | Array<string | [string, ProjectEntryValue]>
    | Record<string, ProjectEntryValue>;

export interface MultipleProjectsConfig extends Partial<SingleProjectConfig> {
    presets?: Presets;
    projects: Projects;
    resolveProjects?: ResolveProjects;
}

export type ProjectEntryValue =
    | string
    | string[]
    | {
          preset?: string;
          presets?: string[];
          options: PartialConfigOptions | PartialConfigOptions[];
      };

export interface ProcessProjectsOptions {
    onProjectEntry(entry: [string, ProjectEntryValue] | [string]): void;
}

export interface CliArguments {
    rootDir: string;
    srcDir: string | undefined;
    outDir: string | undefined;
    esm: boolean | undefined;
    cjs: boolean | undefined;
    css: boolean | undefined;
    stcss: boolean | undefined;
    dts: boolean | undefined;
    dtsSourceMap: boolean | undefined;
    useNamespaceReference: boolean | undefined;
    namespaceResolver: string;
    injectCSSRequest: boolean | undefined;
    cssFilename: string | undefined;
    cssInJs: boolean | undefined;
    optimize: boolean | undefined;
    minify: boolean | undefined;
    indexFile: string | undefined;
    manifest: boolean | undefined;
    manifestFilepath: string;
    customGenerator: string | undefined;
    ext: string | undefined;
    require: string[];
    log: boolean | undefined;
    diagnostics: boolean | undefined;
    diagnosticsMode: string | undefined;
    watch: boolean;
}
