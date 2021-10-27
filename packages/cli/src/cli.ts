#!/usr/bin/env node
import { nodeFs } from '@file-services/node';
import { Stylable, StylableResolverCache } from '@stylable/core';
import { build } from './build';
import { createLogger, levels } from './logger';
import { projectsConfig } from './config/projects-config';
import { messages } from './build';
import { getCliArguments } from './config/resolve-options';
import { DirectoriesHandlerService } from './directory-process-service/directories-handler-service';

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

    const { rootDir, projects } = projectsConfig(argv);
    const fileSystem = nodeFs;
    const resolverCache: StylableResolverCache = new Map();
    const outputFiles = new Map<string, string>();
    const directoriesHandler = new DirectoriesHandlerService(fileSystem, {
        log,
        resolverCache,
        outputFiles,
    });

    for (const { projectRoot, options } of projects) {
        for (let i = 0; i < options.length; i++) {
            const optionsEntity = options[i];

            const { dts, dtsSourceMap } = optionsEntity;

            const identifier =
                options.length > 1
                    ? `[${i}] ${projectRoot.replace(rootDir, '')}`
                    : projectRoot.replace(rootDir, '');

            log('[Project]', projectRoot, optionsEntity);

            if (!dts && dtsSourceMap) {
                throw new Error(`"dtsSourceMap" requires turning on "dts"`);
            }

            const stylable = Stylable.create({
                fileSystem,
                requireModule: require,
                projectRoot,
                resolveNamespace: require(argv.namespaceResolver).resolveNamespace,
                resolverCache,
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
            });

            directoriesHandler.register(service, { identifier });
        }
    }

    if (watch) {
        log(messages.START_WATCHING, levels.info);

        directoriesHandler.start();
    }
}

main().catch((e) => {
    process.exitCode = 1;
    console.error(e);
});
