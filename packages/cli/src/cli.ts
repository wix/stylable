#!/usr/bin/env node
import { nodeFs as fs } from '@file-services/node';
import { buildStylable } from './build-stylable';
import { createDefaultOptions, getCliArguments, resolveCliOptions } from './config/resolve-options';
import { createLogger } from './logger';

const argv = getCliArguments();
const { resolve } = fs;
const {
    watch,
    require: requires,
    log: shouldLog,
    namespaceResolver,
    preserveWatchOutput,
    config,
} = argv;
const rootDir = resolve(argv.rootDir);
const explicitResolveNs =
    namespaceResolver &&
    require(
        require.resolve(namespaceResolver, {
            paths: [rootDir],
        }),
    );

//
const log = createLogger(
    (level, ...messages) => {
        if (shouldLog || level === 'info') {
            const currentTime = new Date().toLocaleTimeString();
            console.log('[Stylable]', `[${currentTime}]`, ...messages);
        }
    },
    () => !shouldLog && !preserveWatchOutput && console.clear(),
);

// execute all require hooks before running the CLI build
for (const request of requires) {
    require(request);
}

const defaultOptions = createDefaultOptions();
const overrideBuildOptions = resolveCliOptions(argv, defaultOptions);
const { watchHandler } = buildStylable(rootDir, {
    overrideBuildOptions,
    defaultOptions,
    fs,
    resolveNamespace: explicitResolveNs?.resolveNamespace,
    watch,
    log,
    configFilePath: config,
});

process.on('SIGTERM', () => {
    watchHandler.stop();
});

process.on('SIGINT', () => {
    watchHandler.stop();
});
