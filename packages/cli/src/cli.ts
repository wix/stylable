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

    for (const contextDir in projects) {
        const options = projects[contextDir];

        const { dts, dtsSourceMap } = options;

        log('[Project]', contextDir, options);

        if (!dts && dtsSourceMap) {
            throw new Error(`"dtsSourceMap" requires turning on "dts"`);
        }

        const fileSystem = nodeFs;
        const stylable = Stylable.create({
            fileSystem,
            requireModule: require,
            projectRoot: contextDir,
            resolveNamespace: require(argv.namespaceResolver).resolveNamespace,
            resolverCache: new Map(),
        });

        await build({
            ...options,
            watch,
            stylable,
            log,
            fs: fileSystem,
            rootDir: contextDir,
        });
    }
}

main().catch((e) => {
    process.exitCode = 1;
    console.error(e);
});
