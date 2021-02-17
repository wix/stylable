#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { Stylable } from '@stylable/core';
import { build } from './build';

const { argv } = yargs
    .option('rootDir', {
        type: 'string',
        description: 'root directory of project',
        default: process.cwd(),
        defaultDescription: 'current working directory',
    })
    .option('srcDir', {
        type: 'string',
        description: 'source directory relative to root',
        default: '.',
    })
    .option('outDir', {
        type: 'string',
        description: 'target directory relative to root',
        default: '.',
    })
    .option('esm', {
        type: 'boolean',
        description: 'output esm module (.mjs)',
        default: false,
    })
    .option('cjs', {
        type: 'boolean',
        description: 'output commonjs module (.js)',
        default: true,
    })
    .option('css', {
        type: 'boolean',
        description: 'output transpiled css (.css)',
        default: false,
    })
    .option('stcss', {
        type: 'boolean',
        description: 'output stylable sources (.st.css)',
        default: false,
    })
    .option('useNamespaceReference', {
        type: 'boolean',
        description:
            'mark output .st.css files in outDir (cjs, esm) with the relative path to the matching output source file to use for its namespace',
        default: false,
        alias: 'unsr',
    })
    .option('namespaceResolver', {
        description: 'node request to a module that exports a stylable resolveNamespace function',
        alias: 'nsr',
        default: '@stylable/node',
    })
    .option('injectCSSRequest', {
        type: 'boolean',
        description: 'add a static import for the generated css in the js module output',
        default: false,
        alias: 'icr',
    })
    .option('cssFilename', {
        type: 'string',
        description: 'pattern of the generated css file',
        default: '[filename].css',
    })
    .option('cssInJs', {
        type: 'boolean',
        description: 'output transpiled css into the js module',
        default: false,
    })
    .option('optimize', {
        type: 'boolean',
        description: 'removes: empty nodes, stylable directives, comments',
        alias: 'o',
        default: false,
    })
    .option('minify', {
        type: 'boolean',
        description: 'minify generated css',
        alias: 'm',
        default: false,
    })
    .option('indexFile', {
        type: 'string',
        description: 'filename of the generated index',
    })
    .option('manifest', {
        type: 'boolean',
        description: 'should output manifest file',
        default: false,
    })
    .option('manifestFilepath', {
        type: 'string',
        description: 'manifest filepath relative to outDir',
        default: 'stylable.manifest.json',
    })
    .option('customGenerator', {
        type: 'string',
        description: 'path to file containing indexFile output override methods',
    })
    .option('ext', {
        type: 'string',
        description: 'extension of stylable css files',
        default: '.st.css',
    })
    .option('require', {
        type: 'array',
        description: 'require hooks',
        alias: 'r',
        default: [] as string[],
    })
    .option('log', {
        type: 'boolean',
        description: 'verbose log',
        default: false,
    })
    .option('diagnostics', {
        type: 'boolean',
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
    resolverCache: new Map()
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
