#!/usr/bin/env node

import fs from 'fs';
import yargs from 'yargs';
import { registeredMods } from './code-mods/apply-code-mods';
import { codeMods } from './code-mods/code-mods';
import { createLogger } from './logger';

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
        choices: Object.keys(registeredMods),
    })
    .alias('h', 'help')
    .help()
    .strict()
    .parseSync();

const { mods, rootDir } = argv;

codeMods({
    extension: '.st.css',
    fs,
    log: createLogger('[CodeMod]', true),
    mods,
    rootDir,
});
