#!/usr/bin/env node
import { nodeFs } from '@file-services/node';
import { Stylable } from '@stylable/core';
import { build } from './build';
import { createLogger } from './logger';
import { projectsConfig } from './projects-config';
import { getCliArguments } from './resolve-options';

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

    const projects = projectsConfig(argv);
    const resolverCache = new Map();

    for (const [projectRoot, options] of Object.entries(projects)) {
        const { dts, dtsSourceMap } = options;

        log('[Project]', projectRoot, options);

        if (!dts && dtsSourceMap) {
            throw new Error(`"dtsSourceMap" requires turning on "dts"`);
        }

        const fileSystem = nodeFs;
        const stylable = Stylable.create({
            fileSystem,
            requireModule: require,
            projectRoot,
            resolveNamespace: require(argv.namespaceResolver).resolveNamespace,
            resolverCache,
        });

        await build({
            watch,
            stylable,
            log,
            fs: fileSystem,
            rootDir: projectRoot,
            ...options,
        });
    }
}

main().catch((e) => {
    process.exitCode = 1;
    console.error(e);
});
