import type { IFileSystem } from '@file-services/types';
import type { Stylable } from '@stylable/core';
import type { IndexGenerator } from './base-generator';
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
export type Configuration<P extends string = string> =
    | SingleProjectConfig
    | MultipleProjectsConfig<P>;

export type ConfigurationProvider<P extends string = string> = () => Configuration<P>;

export function typedConfiguration<P extends string>(
    configOrConfigProvider: Configuration<P> | ConfigurationProvider<P>
) {
    return configOrConfigProvider;
}

export interface ProjectEntity {
    options: BuildOptions[];
    projectRoot: string;
}
export interface RawProjectEntity {
    options: BuildOptions[];
    request: string;
}

export type STCProjects = ProjectEntity[];
export type ResolveRequests = (
    projects: Array<RawProjectEntity>,
    context: ResolveProjectsContext
) => Promise<STCProjects> | STCProjects;

export interface ResolveProjectsContext {
    rootDir: string;
}

export type Presets<P extends string = string> = {
    [key in P]: PartialBuildOptions;
};

export type Projects<P extends string> =
    | Array<string | [string, ProjectEntryValues<P>]>
    | Record<string, ProjectEntryValues<P>>;

export interface SingleProjectConfig {
    options: PartialBuildOptions;
}
export interface MultipleProjectsConfig<P extends string> {
    options?: PartialBuildOptions;
    presets?: Presets<P>;
    projects: Projects<P>;
    projectsOptions?: {
        resolveRequests?: ResolveRequests;
    };
}

export type ProjectEntryValues<P extends string> =
    | ProjectEntryValue<P>
    | Array<ProjectEntryValue<P>>;

export type ProjectEntryValue<P extends string> =
    | P
    | PartialBuildOptions
    | {
          preset?: P;
          presets?: Array<P>;
          options: PartialBuildOptions;
      };

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
    require: string[];
    log: boolean | undefined;
    diagnostics: boolean | undefined;
    diagnosticsMode: string | undefined;
    watch: boolean;
    preserveWatchOutput: boolean;
    config: string | undefined;
}

export interface BuildOptions {
    /** specify where to find source files */
    srcDir: string;
    /** specify where to build the target files */
    outDir: string;
    /** should the build need to output manifest file */
    manifest?: string;
    /** opt into build index file and specify the filepath for the generated index file */
    indexFile?: string;
    /** custom cli index generator class */
    IndexGenerator?: typeof IndexGenerator;
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

export interface BuildContext {
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
    /** output file to source files map */
    outputFiles?: Map<string, Set<string>>;
    /** stores and report diagnostics */
    diagnosticsManager?: DiagnosticsManager;
}
