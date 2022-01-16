import { nodeFs as fs } from '@file-services/node';
import { createRequestResolver } from '@file-services/resolve';
import type { IFileSystem } from '@file-services/types';
import { Stylable, StylableConfig, StylableResolverCache } from '@stylable/core';
import { build } from './build';
import { projectsConfig } from './config/projects-config';
import {
    createBuildIdentifier,
    createDefaultOptions,
    NAMESPACE_RESOLVER_MODULE_REQUEST,
} from './config/resolve-options';
import { DiagnosticsManager } from './diagnostics-manager';
import { createDefaultLogger } from './logger';
import type { BuildContext, BuildOptions } from './types';
import { WatchHandler } from './watch-handler';

export interface BuildStylableContext
    extends Partial<Pick<BuildContext, 'fs' | 'watch' | 'log'>>,
        Partial<Pick<StylableConfig, 'resolveNamespace' | 'requireModule' | 'resolveModule'>> {
    resolverCache?: StylableResolverCache;
    fileProcessorCache?: StylableConfig['fileProcessorCache'];
    diagnosticsManager?: DiagnosticsManager;
    outputFiles?: Map<string, Set<string>>;
    defaultOptions?: BuildOptions;
    overrideBuildOptions?: Partial<BuildOptions>;
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
            onFatalDiagnostics() {
                if (!watch) {
                    process.exitCode = 1;
                }
            },
        }),
        outputFiles = new Map(),
        requireModule = require,
        resolveNamespace = requireModule(NAMESPACE_RESOLVER_MODULE_REQUEST).resolveNamespace,
        resolveModule = createDefaultResolveModule(fs),
    }: BuildStylableContext = {}
) {
    const projects = await projectsConfig(rootDir, overrideBuildOptions, defaultOptions);
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

            const stylable = Stylable.create({
                fileSystem,
                requireModule,
                resolveModule,
                projectRoot,
                resolveNamespace,
                resolverCache,
                fileProcessorCache,
            });

            const { service } = await build(buildOptions, {
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

            watchHandler.register({ service, identifier, stylable });
        }
    }

    diagnosticsManager.report();

    if (watch) {
        watchHandler.start();
    }

    return { watchHandler };
}

function createDefaultResolveModule(fs: IFileSystem): BuildStylableContext['resolveModule'] {
    const moduleResolver = createRequestResolver({ fs });

    return (context, request) => {
        const { resolvedFile } = moduleResolver(context, request);

        if (resolvedFile === false) {
            throw new Error(
                `Stylable CLI does not support browser field 'false' values. ${request} resolved to 'false' from ${context}`
            );
        } else if (resolvedFile === undefined) {
            throw new Error(`Stylable CLI cannot resolve request: ${request}`);
        }

        return resolvedFile;
    };
}
