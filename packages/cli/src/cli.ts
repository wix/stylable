#!/usr/bin/env node
import { nodeFs } from '@file-services/node';
import { Stylable } from '@stylable/core';
import { build } from './build';
import { createLogger, levels } from './logger';
import { projectsConfig } from './config/projects-config';
import { messages } from './build';
import { getCliArguments } from './config/resolve-options';

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

    if (projects.length > 1 && watch) {
        throw new Error('Stylable CLI watch mode in multiple projects is not supported yet');
    }

    for (const { projectRoot, options } of projects) {
        for (const optionsEntity of options) {
            const { dts, dtsSourceMap } = optionsEntity;

            log('[Project]', projectRoot, optionsEntity);

            if (!dts && dtsSourceMap) {
                throw new Error(`"dtsSourceMap" requires turning on "dts"`);
            }

            const fileSystem = nodeFs;
            const stylable = Stylable.create({
                fileSystem,
                requireModule: require,
                projectRoot,
                resolveNamespace: require(argv.namespaceResolver).resolveNamespace,
                resolverCache: new Map(),
            });

            await build(optionsEntity, {
                watch,
                stylable,
                log,
                fs: fileSystem,
                rootDir,
                projectRoot,
            });
        }
    }

    if (watch) {
        log(messages.START_WATCHING, levels.info);
    }
}

main().catch((e) => {
    process.exitCode = 1;
    console.error(e);
});
