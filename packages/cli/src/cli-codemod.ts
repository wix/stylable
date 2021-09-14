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
import type { CodeMod } from './code-mods/apply-code-mods';

const argv = yargs
    .option('rootDir', {
        type: 'string',
        description: 'root directory of project',
        default: process.cwd(),
        defaultDescription: 'current working directory',
    })
    .option('mods', {
        type: 'array',
        default: [] as string[],
        choices: [...registeredMods.keys()],
    })
    .option('external', {
        type: 'array',
        description: 'allow to load mods from external',
        alias: 'e',
        default: [] as string[],
    })
    .option('require', {
        type: 'array',
        description: 'require hooks',
        alias: 'r',
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
    if (request) {
        require(request);
    }
}

const log = createLogger('[CodeMod]', true);

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
