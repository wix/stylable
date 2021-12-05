import type { IFileSystem } from '@file-services/types';
import type { Stylable } from '@stylable/core';
import type { Generator as BaseGenerator } from './base-generator';
import type { DiagnosticsManager, DiagnosticsMode } from './diagnostics-manager';
import type { Log } from './logger';

export type PartialBuildOptions = Partial<BuildOptions>;

/**
 * User's configuration object
 * @example
 * exports.stcConfig = {
 *   options: {
 *      rootDir: './src'
 *   }
 * }
 */
export type Configuration<T extends string = string> =
    | SingleProjectConfig
    | MultipleProjectsConfig<T>;

export type ConfigurationProvider<T extends string = string> = () => Configuration<T>;

export function typedConfiguration<T extends string>(
    configOrConfigProvider: Configuration<T> | ConfigurationProvider<T>
) {
    return configOrConfigProvider;
}

interface BaseProjectEntity {
    options: BuildOptions[];
}

export interface ProjectEntity extends BaseProjectEntity {
    projectRoot: string;
}
export interface RawProjectEntity extends BaseProjectEntity {
    request: string;
}

export type STCConfig = ProjectEntity[];
export type ResolveRequests = (
    projects: Array<RawProjectEntity>,
    context: ResolveProjectsContext
) => Promise<STCConfig> | STCConfig;

export interface ResolveProjectsContext {
    projectRoot: string;
}

export interface ResolveProjectsRequestsParams {
    projectRoot: string;
    entities: Array<RawProjectEntity>;
    resolveRequests: ResolveRequests;
}

export interface SingleProjectConfig {
    options: PartialBuildOptions;
}

export type Presets<T extends string = string> = {
    [key in T]: PartialBuildOptions;
};

export type Projects<T extends string> =
    | Array<string | [string, ProjectEntryValues<T>]>
    | Record<string, ProjectEntryValues<T>>;

export interface MultipleProjectsConfig<T extends string> extends Partial<SingleProjectConfig> {
    presets?: Presets<T>;
    projects: Projects<T>;
    projectsOptions?: {
        resolveRequests?: ResolveRequests;
    };
}

export type ProjectEntryValue<T extends string> =
    | T
    | PartialBuildOptions
    | {
          preset?: T;
          presets?: Array<T>;
          options: PartialBuildOptions;
      };

export type ProjectEntryValues<T extends string> =
    | ProjectEntryValue<T>
    | Array<ProjectEntryValue<T>>;

export interface ProcessProjectsOptions {
    defaultOptions?: BuildOptions;
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

export interface ProjectsConfigResult {
    rootDir: string;
    projects: STCConfig;
}

export interface BuildOptions {
    /** Specify the extension of stylable files */
    extension: string;
    /** specify where to find source files */
    srcDir: string;
    /** specify where to build the target files */
    outDir: string;
    /** should the build need to output manifest file */
    manifest?: string;
    /** opt into build index file and specify the filepath for the generated index file */
    indexFile?: string;
    /** custom cli index generator class */
    Generator?: typeof BaseGenerator;
    /** output commonjs module (.js) */
    cjs?: boolean;
    /** output esm module (.mjs) */
    esm?: boolean;
    /** template of the css file emitted when using outputCSS */
    outputCSSNameTemplate?: string;
    /** should include the css in the generated JS module */
    includeCSSInJS?: boolean;
    /** should output build css for each source file */
    outputCSS?: boolean;
    /** should output source .st.css file to dist */
    outputSources?: boolean;
    /** should add namespace reference to the .st.css copy  */
    useNamespaceReference?: boolean;
    /** should inject css import in the JS module for the generated css from outputCSS */
    injectCSSRequest?: boolean;
    /** should apply css optimizations */
    optimize?: boolean;
    /** should minify css */
    minify?: boolean;
    /** should generate .d.ts definitions for every stylesheet */
    dts?: boolean;
    /** should generate .d.ts.map files for every .d.ts mapping back to the source .st.css */
    dtsSourceMap?: boolean;
    /** should emit diagnostics */
    diagnostics?: boolean;
    /** determine the diagnostics mode. if strict process will exit on any exception, loose will attempt to finish the process regardless of exceptions */
    diagnosticsMode?: DiagnosticsMode;
}

export interface BuildMetaData {
    /** build identifier */
    identifier?: string;
    /** enable watch mode */
    watch?: boolean;
    /** main project root directory */
    rootDir: string;
    /** project root directory */
    projectRoot: string;
    /** provide a custom file-system for the build */
    fs: IFileSystem;
    /** provide Stylable instance */
    stylable: Stylable;
    /** log function */
    log: Log;
    /** output file to source file map */
    outputFiles?: Map<string, string>;
    /** stores and report diagnostics */
    diagnosticsManager?: DiagnosticsManager;
}
