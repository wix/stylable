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

    .option('esm')
    .boolean('esm')
    .describe('esm', 'output esm module format .mjs')
    .default('esm', false)

    .option('cjs')
    .boolean('cjs')
    .describe('cjs', 'output commonjs module .js')
    .default('cjs', true)

    .option('css')
    .boolean('css')
    .describe('css', 'output transpiled css file .css')
    .default('css', false)

    .option('cssInJs')
    .boolean('cssInJs')
    .describe('cssInJs', 'output transpiled css into the js module')
    .default('cssInJs', false)


    .option('indexFile')
    .describe('indexFile', 'filename of the generated index')
    .default('indexFile', false)

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
const { outDir, srcDir, rootDir, ext, indexFile, customGenerator: generatorPath, esm, cjs, css, cssInJs } = argv;

log('[Arguments]', argv);

const stylable = new Stylable(rootDir, fs, require);
const formats: { [format: string]: boolean } = { esm, cjs };
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
    moduleFormats: Object.keys(formats).filter(k => formats[k]),
    outputCSS: css,
    includeCSSInJS: cssInJs
});

function createLogger(prefix: string, shouldLog: boolean) {
    return function log(...messages: string[]) {
        if (shouldLog) {
            console.log(prefix, ...messages);
        }
    };
}
