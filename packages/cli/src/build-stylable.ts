import { nodeFs as fs } from '@file-services/node';
import { Stylable, StylableConfig } from '@stylable/core';
import { StylableResolverCache, validateDefaultConfig } from '@stylable/core/dist/index-internal';
import { build } from './build';
import { projectsConfig, resolveConfig } from './config/projects-config';
import {
    createBuildIdentifier,
    createDefaultOptions,
    hasStylableCSSOutput,
    NAMESPACE_RESOLVER_MODULE_REQUEST,
} from './config/resolve-options';
import { DiagnosticsManager } from './diagnostics-manager';
import { createDefaultLogger, levels } from './logger';
import type { BuildContext, BuildOptions } from './types';
import { WatchHandler } from './watch-handler';

export interface BuildStylableContext
    extends Partial<Pick<BuildContext, 'fs' | 'watch' | 'log'>>,
        Partial<Pick<StylableConfig, 'resolveNamespace' | 'requireModule'>> {
    resolverCache?: StylableResolverCache;
    fileProcessorCache?: StylableConfig['fileProcessorCache'];
    diagnosticsManager?: DiagnosticsManager;
    outputFiles?: Map<string, Set<string>>;
    defaultOptions?: BuildOptions;
    overrideBuildOptions?: Partial<BuildOptions>;
    configFilePath?: string;
    watchOptions?: {
        lazy?: boolean;
    };
}

export async function buildStylable(
    rootDir: string,
    {
        defaultOptions = createDefaultOptions(),
        overrideBuildOptions = {},
        fs: fileSystem = fs,
        log = createDefaultLogger(),
        watch = false,
        resolverCache = new Map(),
        fileProcessorCache = {},
        diagnosticsManager = new DiagnosticsManager({
            log,
            hooks: {
                postReport(_diagnostics, hasFatalDiagnostic) {
                    if (hasFatalDiagnostic && !watch) {
                        process.exitCode = 1;
                    }
                },
            },
        }),
        outputFiles = new Map(),
        requireModule = require,
        resolveNamespace = requireModule(NAMESPACE_RESOLVER_MODULE_REQUEST).resolveNamespace,
        configFilePath,
        watchOptions = {},
    }: BuildStylableContext = {}
) {
    const { config } = resolveConfig(rootDir, configFilePath, fs) || {};
    validateDefaultConfig(config?.defaultConfig);

    const projects = await projectsConfig(rootDir, overrideBuildOptions, defaultOptions, config);
    const watchHandler = new WatchHandler(fileSystem, {
        log,
        resolverCache,
        outputFiles,
        rootDir,
        diagnosticsManager,
    });

    for (const { projectRoot, options } of projects) {
        for (let i = 0; i < options.length; i++) {
            const buildOptions = options[i];
            const identifier = createBuildIdentifier(
                rootDir,
                projectRoot,
                i,
                options.length > 1,
                projects.length > 1
            );

            log('[Project]', projectRoot, buildOptions);

            if (!hasStylableCSSOutput(buildOptions)) {
                log(
                    `No target output declared for "${identifier}", please provide one or more of the following target options: "cjs", "esm", "css", "stcss" or "indexFile"`,
                    levels.info
                );
            }

            const stylable = new Stylable({
                fileSystem,
                requireModule,
                projectRoot,
                resolveNamespace,
                resolverCache,
                fileProcessorCache,
                ...config?.defaultConfig,
            });

            const { service, generatedFiles } = await build(buildOptions, {
                watch,
                stylable,
                log,
                fs: fileSystem,
                rootDir,
                projectRoot,
                outputFiles,
                identifier,
                diagnosticsManager,
            });

            watchHandler.register({ service, identifier, stylable, generatedFiles });
        }
    }

    diagnosticsManager.report();

    if (watch && !watchOptions.lazy) {
        watchHandler.start();
    }

    return { watchHandler, outputFiles, projects, diagnosticsManager };
}
