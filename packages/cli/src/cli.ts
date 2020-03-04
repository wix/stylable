#!/usr/bin/env node

import { Stylable } from '@stylable/core';
import * as fs from 'fs';
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

    .option('js')
    .boolean('js')
    .describe('js', 'output stylable js module (.st.css.js)')
    .default('js', true)

    .option('stcss')
    .boolean('stcss')
    .describe('stcss', 'output stylable sources (.st.css)')
    .default('stcss', true)

    .option('indexFile')
    .describe('indexFile', 'filename of the generated index')
    .default('indexFile', false)

    .option('useNamespaceReference')
    .boolean('useNamespaceReference')
    .alias('useNamespaceReference', 'unsr')
    .describe(
        'useNamespaceReference',
        // tslint:disable-next-line: max-line-length
        'mark output .st.css files in outDir (cjs, esm) with the relative path to the matching output source file to use for its namespace'
    )
    .default('useNamespaceReference', false)

    .option('customGenerator')
    .describe('customGenerator', 'path to file containing indexFile output override methods')

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
const {
    outDir,
    srcDir,
    rootDir,
    ext,
    indexFile,
    customGenerator: generatorPath,
    js,
    stcss,
    useNamespaceReference
} = argv;

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
    indexFile,
    generatorPath,
    outputJs: js,
    outputSources: stcss,
    useNamespaceReference
});

function createLogger(prefix: string, shouldLog: boolean) {
    return function log(...messages: string[]) {
        if (shouldLog) {
            console.log(prefix, ...messages);
        }
    };
}
