#!/usr/bin/env node

import { Stylable } from '@stylable/core';
import fs from 'fs';
import path from 'path';
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
    .describe('cjs', 'output commonjs module (.js)')
    .default('cjs', true)

    .option('css')
    .boolean('css')
    .describe('css', 'output transpiled css file (.css)')
    .default('css', false)

    .option('stcss')
    .boolean('stcss')
    .describe('stcss', 'output stylable sources (.st.css)')
    .default('stcss', false)

    .option('compat')
    .boolean('compat')
    .describe('compat', 'use legacy v1 runtime api')
    .default('compat', false)

    .option('namespaceResolver')
    .alias('namespaceResolver', 'nsr')
    .describe(
        'namespaceResolver',
        'node request to a module that exports a stylable resolveNamespace function'
    )
    .default('namespaceResolver', '@stylable/node')

    .option('injectCSSRequest')
    .alias('injectCSSRequest', 'icr')
    .boolean('injectCSSRequest')
    .describe(
        'injectCSSRequest',
        'add a static import for the generated css in the js module output'
    )
    .default('injectCSSRequest', false)

    .option('cssFilename')
    .describe('cssFilename', 'pattern of the generated css file')
    .default('cssFilename', '[filename].css')

    .option('cssInJs')
    .boolean('cssInJs')
    .describe('cssInJs', 'output transpiled css into the js module')
    .default('cssInJs', false)

    .option('optimize')
    .alias('optimize', 'o')
    .boolean('optimize')
    .describe('optimize', 'removes: empty nodes, stylable directives, comments')
    .default('optimize', false)

    .option('minify')
    .alias('minify', 'm')
    .boolean('minify')
    .describe('minify', 'minify generated css')
    .default('minify', false)
    
    .option('indexFile')
    .describe('indexFile', 'filename of the generated index')
    .default('indexFile', false)
    
    .option('manifest')
    .boolean('manifest')
    .describe('manifest', 'should output manifest file')
    .default('manifest', false)

    .option('manifestFilepath')
    .describe('manifestFilepath', 'manifest filepath relative to outDir')
    .default('manifestFilepath', 'stylable.manifest.json')

    .option('customGenerator')
    .describe('customGenerator', 'path to file containing indexFile output override methods')

    .option('ext')
    .describe('ext', 'extension of stylable css files')
    .default('ext', '.st.css')

    .option('require')
    .alias('require', 'r')
    .array('require')
    .describe('require', 'require hook ')
    .default('require', [])

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
    esm,
    cjs,
    css,
    stcss,
    cssInJs,
    namespaceResolver,
    injectCSSRequest,
    cssFilename,
    optimize,
    compat,
    minify,
    manifestFilepath,
    manifest,
    require: requires
} = argv;

log('[Arguments]', argv);

// execute all require hooks before running the CLI build
for (const request of requires) {
    if (request) {
        require(request);
    }
}

const stylable = Stylable.create({
    fileSystem: fs,
    requireModule: require,
    projectRoot: rootDir,
    resolveNamespace: require(namespaceResolver).resolveNamespace
});

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
    moduleFormats: getModuleFormats({ esm, cjs }),
    outputCSS: css,
    includeCSSInJS: cssInJs,
    outputSources: stcss,
    injectCSSRequest,
    outputCSSNameTemplate: cssFilename,
    optimize,
    compat,
    minify,
    manifest: manifest ? path.join(rootDir, outDir, manifestFilepath) : undefined
});

function getModuleFormats({ esm, cjs }: { [k: string]: boolean }) {
    const formats: Array<'esm' | 'cjs'> = [];
    if (esm) {
        formats.push('esm');
    }
    if (cjs) {
        formats.push('cjs');
    }
    return formats;
}

function createLogger(prefix: string, shouldLog: boolean) {
    return function log(...messages: string[]) {
        if (shouldLog) {
            console.log(prefix, ...messages);
        }
    };
}
