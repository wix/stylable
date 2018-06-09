#!/usr/bin/env node
import * as fs from 'fs';
import { Stylable } from 'stylable';
import { build } from './build';

const argv = require('yargs')
    .option('rootDir')
    .describe('rootDir', 'root directory of project')
    .default('rootDir', process.cwd(), 'cwd')

    .option('srcDir')
    .describe('srcDir', 'source directory relative to root')
    .default('srcDir', '.')

    .option('outDir')
    .describe('outDir', 'target directory relative to root')
    .default('outDir', '.')

    .option('indexFile')
    .describe('indexFile', 'filename of the generated index')
    .default('indexFile', 'index.st.css')

    .option('ext')
    .describe('ext', 'extension of stylable css files')
    .default('ext', '.st.css')

    .option('log')
    .describe('log', 'verbose log')
    .default('log', false)

    .option('diagnostics')
    .describe('diagnostics', 'verbose diagnostics')
    .default('diagnostics', false)

    .alias('h', 'help')
    .help().argv;

const log = createLogger('[Stylable]', argv.log);
const diagnostics = createLogger('[Stylable Diagnostics]\n', argv.diagnostics);
const { outDir, srcDir, rootDir, ext, indexFile } = argv;

log('[Arguments]', argv);

const stylable = new Stylable(rootDir, fs, require);

build({
    extension: ext,
    fs,
    stylable,
    outDir,
    srcDir,
    rootDir,
    log,
    diagnostics,
    indexFile
});

function createLogger(prefix: string, shouldLog: boolean) {
    return function log(...messages: string[]) {
        if (shouldLog) {
            console.log(prefix, ...messages);
        }
    };
}
