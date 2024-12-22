import { nodeFs } from '@file-services/node';
import { Stylable, StylableConfig } from '@stylable/core';
import { StylableResolverCache, validateDefaultConfig } from '@stylable/core/dist/index-internal';
import { build } from './build';
import { projectsConfig, resolveConfig } from './config/projects-config';
import {
    createBuildIdentifier,
    createDefaultOptions,
    hasStylableCSSOutput,
} from './config/resolve-options';
import { DiagnosticsManager } from './diagnostics-manager';
import { createDefaultLogger, levels } from './logger';
import type { BuildContext, BuildOptions } from './types';
import { WatchHandler } from './watch-handler';
import { createWatchService } from './watch-service';

export interface BuildStylableContext
    extends Partial<Pick<BuildContext, 'fs' | 'watch' | 'log'>>,
        Partial<Pick<StylableConfig, 'resolveNamespace' | 'requireModule' | 'resolveModule'>> {
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

export function buildStylable(
    rootDir: string,
    {
        defaultOptions = createDefaultOptions(),
        overrideBuildOptions = {},
        fs = nodeFs,
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
        resolveNamespace,
        resolveModule,
        configFilePath,
        watchOptions = {},
    }: BuildStylableContext = {},
) {
    const { config } = resolveConfig(rootDir, fs, configFilePath) || {};
    validateDefaultConfig(config?.defaultConfig);

    const projects = projectsConfig(rootDir, overrideBuildOptions, defaultOptions, config);
    const watchService = createWatchService(fs);
    const watchHandler = new WatchHandler(fs, watchService, {
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
                projects.length > 1,
            );

            log('[Project]', projectRoot, buildOptions);

            if (!hasStylableCSSOutput(buildOptions)) {
                log(
                    `No target output declared for "${identifier}", please provide one or more of the following target options: "cjs", "esm", "css", "stcss" or "indexFile"`,
                    levels.info,
                );
            }

            const stylable = new Stylable({
                fileSystem: fs,
                requireModule,
                projectRoot,
                resolverCache,
                fileProcessorCache,
                ...config?.defaultConfig,
                resolveModule: resolveModule || config?.defaultConfig?.resolveModule,
                resolveNamespace:
                    resolveNamespace ||
                    config?.defaultConfig?.resolveNamespace ||
                    requireModule('@stylable/node').resolveNamespace,
            });

            const { service, generatedFiles } = build(buildOptions, {
                watch,
                stylable,
                log,
                fs,
                watchService,
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
