#!/usr/bin/env node
import { nodeFs } from '@file-services/node';
import { Stylable, StylableResolverCache } from '@stylable/core';
import { build } from './build';
import { createLogger, levels } from './logger';
import { projectsConfig } from './config/projects-config';
import { getCliArguments } from './config/resolve-options';
import { BuildsHandler } from './builds-handler';
import { messages } from './messages';
import { DiagnosticsManager } from './diagnostics-manager';

// TODO: remove this when memory leak fixed
process.on('warning', (e) => console.warn('CLI STACK', e.stack));

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
    const outputFiles = new Map<string, string>();
    const isMultipleProjects = projects.length > 1;
    const diagnosticsManager = new DiagnosticsManager();
    const buildsHandler = new BuildsHandler(fileSystem, {
        log,
        resolverCache,
        outputFiles,
        rootDir,
        diagnosticsManager,
    });

    for (const { projectRoot, options } of projects) {
        const hasMultipleOptions = options.length > 1;

        for (let i = 0; i < options.length; i++) {
            const optionsEntity = options[i];
            const identifier = hasMultipleOptions
                ? `[${i}] ${projectRoot.replace(rootDir, '')}`
                : isMultipleProjects
                ? projectRoot.replace(rootDir, '')
                : projectRoot;

            log('[Project]', projectRoot, optionsEntity);

            const stylable = Stylable.create({
                fileSystem,
                requireModule: require,
                projectRoot,
                resolveNamespace: require(argv.namespaceResolver).resolveNamespace,
                resolverCache,
                fileProcessorCache,
            });

            const { service } = await build(optionsEntity, {
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

            buildsHandler.register(service, { identifier, stylable });
        }
    }

    diagnosticsManager.report();

    if (watch) {
        log(messages.START_WATCHING(), levels.info);

        buildsHandler.start();

        process.on('SIGTERM', () => {
            buildsHandler.stop();
        });
    }
}

main().catch((e) => {
    process.exitCode = 1;
    console.error(e);
});
