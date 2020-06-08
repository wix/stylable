#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { Stylable } from '@stylable/core';
import { build } from './build';

const { argv } = yargs
    .option('rootDir', {
        description: 'root directory of project',
        default: process.cwd(),
        defaultDescription: 'current working directory',
    })
    .option('srcDir', {
        description: 'source directory relative to root',
        default: '.',
    })
    .option('outDir', {
        description: 'target directory relative to root',
        default: '.',
    })
    .option('esm', {
        description: 'output esm module (.mjs)',
        type: 'boolean',
        default: false,
    })
    .option('cjs', {
        description: 'output commonjs module (.js)',
        type: 'boolean',
        default: true,
    })
    .option('css', {
        description: 'output transpiled css (.css)',
        type: 'boolean',
        default: false,
    })
    .option('stcss', {
        description: 'output stylable sources (.st.css)',
        type: 'boolean',
        default: false,
    })
    .option('useNamespaceReference', {
        description:
            'mark output .st.css files in outDir (cjs, esm) with the relative path to the matching output source file to use for its namespace',
        type: 'boolean',
        default: false,
        alias: 'unsr',
    })
    .option('namespaceResolver', {
        description: 'node request to a module that exports a stylable resolveNamespace function',
        alias: 'nsr',
        default: '@stylable/node',
    })
    .option('injectCSSRequest', {
        description: 'add a static import for the generated css in the js module output',
        type: 'boolean',
        default: false,
        alias: 'icr',
    })
    .option('cssFilename', {
        description: 'pattern of the generated css file',
        default: '[filename].css',
    })
    .option('cssInJs', {
        description: 'output transpiled css into the js module',
        type: 'boolean',
        default: false,
    })
    .option('optimize', {
        description: 'removes: empty nodes, stylable directives, comments',
        alias: 'o',
        type: 'boolean',
        default: false,
    })
    .option('minify', {
        description: 'minify generated css',
        alias: 'm',
        type: 'boolean',
        default: false,
    })
    .option('indexFile', {
        description: 'filename of the generated index',
        type: 'string',
    })
    .option('manifest', {
        description: 'should output manifest file',
        type: 'boolean',
        default: false,
    })
    .option('manifestFilepath', {
        description: 'manifest filepath relative to outDir',
        default: 'stylable.manifest.json',
    })
    .option('customGenerator', {
        description: 'path to file containing indexFile output override methods',
        type: 'string',
    })
    .option('ext', {
        description: 'extension of stylable css files',
        default: '.st.css',
    })
    .option('require', {
        description: 'require hooks',
        alias: 'r',
        type: 'array',
        default: [] as string[],
    })
    .option('log', {
        description: 'verbose log',
        default: false,
    })
    .option('diagnostics', {
        description: 'verbose diagnostics',
        default: false,
    })
    .alias('h', 'help')
    .help()
    .strict();

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
    minify,
    manifestFilepath,
    manifest,
    require: requires,
    useNamespaceReference,
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
    resolveNamespace: require(namespaceResolver).resolveNamespace,
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
    minify,
    manifest: manifest ? path.join(rootDir, outDir, manifestFilepath) : undefined,
    useSourceNamespace: useNamespaceReference,
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
    return function log(...messages: any[]) {
        if (shouldLog) {
            console.log(prefix, ...messages);
        }
    };
}
