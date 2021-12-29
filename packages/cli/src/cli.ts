#!/usr/bin/env node
import { nodeFs } from '@file-services/node';
import { Stylable, StylableResolverCache } from '@stylable/core';
import { build } from './build';
import { createLogger, levels } from './logger';
import { projectsConfig } from './config/projects-config';
import { createBuildIdentifier, getCliArguments } from './config/resolve-options';
import { WatchHandler } from './watch-handler';
import { buildMessages } from './messages';
import { DiagnosticsManager } from './diagnostics-manager';

async function main() {
    const argv = getCliArguments();
    const log = createLogger('[Stylable]', argv.log ?? false);

    log('[CLI Arguments]', argv);

    const { watch, require: requires } = argv;

    // execute all require hooks before running the CLI build
    for (const request of requires) {
        if (request) {
            require(request);
        }
    }

    const { rootDir, projects } = await projectsConfig(argv);
    const fileSystem = nodeFs;
    const resolverCache: StylableResolverCache = new Map();
    const fileProcessorCache = {};
    const outputFiles = new Map<string, Set<string>>();
    const { resolveNamespace } = require(argv.namespaceResolver);
    const diagnosticsManager = new DiagnosticsManager();
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
                requireModule: require,
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
        log(buildMessages.START_WATCHING(), levels.info);

        watchHandler.start();

        process.on('SIGTERM', () => {
            void watchHandler.stop();
        });
    }
}

main().catch((e) => {
    process.exitCode = 1;
    console.error(e);
});
