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

export interface STCConfigEntry {
    projectRoot: string;
    options: ConfigOptions[];
}

export interface ProjectEntry {
    request: string;
    options: ConfigOptions[];
}

export type STCConfig = STCConfigEntry[];
export type ResolveProjects = (
    projects: Array<ProjectEntry>,
    context: ResolveProjectsContext
) => STCConfig;

export interface ResolveProjectsContext {
    projectRoot: string;
}

export interface ResolveProjectsRequestsParams {
    projectRoot: string;
    projects: Array<ProjectEntry>;
    resolveProjects: ResolveProjects;
}

export interface SingleProjectConfig {
    options: PartialConfigOptions;
}

export interface MultipleProjectsConfig extends Partial<SingleProjectConfig> {
    projects:
        | Array<
              | string
              | [
                    string,
                    {
                        options: PartialConfigOptions | PartialConfigOptions[];
                    }
                ]
          >
        | Record<string, PartialConfigOptions | PartialConfigOptions[]>;
    resolveProjects?: ResolveProjects;
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
