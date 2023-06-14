#!/usr/bin/env node

import fs from 'fs';
import { resolve } from 'path';
import yargs from 'yargs';
import { codeMods } from './code-mods/code-mods';
import {
    loadExternalCodemods,
    loadBuiltInCodemods,
    registeredMods,
} from './code-mods/load-codemods';
import { createLogger } from './logger';
import type { CodeMod } from './code-mods/types';

const argv = yargs
    .option('rootDir', {
        alias: 'd',
        type: 'string',
        description: 'root directory of a project',
        default: process.cwd(),
        defaultDescription: 'current working directory',
    })
    .option('mods', {
        alias: 'm',
        type: 'array',
        string: true,
        description: 'array of builtin codemods to execute',
        default: [] as string[],
        choices: [...registeredMods.keys()],
    })
    .option('external', {
        alias: 'e',
        type: 'array',
        string: true,
        description: 'array of external codemod to execute',
        default: [] as string[],
    })
    .option('require', {
        alias: 'r',
        type: 'array',
        string: true,
        description: 'require hooks',
        default: [] as string[],
    })
    .alias('h', 'help')
    .help()
    .strict()
    .parseSync();

const { mods, rootDir: rawRootDir, require: requires, external } = argv;

const rootDir = resolve(rawRootDir);
// execute all require hooks before running the CLI build
for (const request of requires) {
    require(request);
}

const log = createLogger(
    (_, ...messages) => console.log('[CodeMod]', ...messages),
    () => console.clear()
);

const loadedMods = new Set<{ id: string; apply: CodeMod }>();

loadExternalCodemods(external, rootDir, loadedMods, log);
loadBuiltInCodemods(mods, loadedMods, log);

if (loadedMods.size !== mods.length + external.length) {
    log(`Not all codemods has been found. Bail execution.`);
    process.exitCode = 1;
} else {
    codeMods({
        extension: '.st.css',
        fs,
        log,
        mods: loadedMods,
        rootDir,
    });
}
