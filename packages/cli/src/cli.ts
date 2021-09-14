#!/usr/bin/env node
import { build } from './build';
import { resolveCliOptions, resolveDefaultOptions } from './options';
import { projectConfig } from './project-config';
import yargs from 'yargs';

const argv = yargs
    .usage('$0 [options]')
    .option('rootDir', {
        type: 'string',
        description: 'root directory of project',
        defaultDescription: 'current working directory',
    })
    .option('srcDir', {
        type: 'string',
        description: 'source directory relative to root',
    })
    .option('outDir', {
        type: 'string',
        description: 'target directory relative to root',
    })
    .option('esm', {
        type: 'boolean',
        description: 'output esm module (.mjs)',
    })
    .option('cjs', {
        type: 'boolean',
        description: 'output commonjs module (.js)',
    })
    .option('css', {
        type: 'boolean',
        description: 'output transpiled css (.css)',
    })
    .option('stcss', {
        type: 'boolean',
        description: 'output stylable sources (.st.css)',
    })
    .option('dts', {
        type: 'boolean',
        description: 'output stylable definition files for sources (.st.css.d.ts)',
    })
    .option('dtsSourceMap', {
        type: 'boolean',
        description:
            'output source maps for stylable definition files for sources (.st.css.d.ts.map)',
        defaultDescription: 'true if "--dts" option is enabled, otherwise false',
    })
    .option('useNamespaceReference', {
        type: 'boolean',
        description:
            'mark output .st.css files in outDir (cjs, esm) with the relative path to the matching output source file to use for its namespace',
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
        alias: 'icr',
    })
    .option('cssFilename', {
        type: 'string',
        description: 'pattern of the generated css file',
    })
    .option('cssInJs', {
        type: 'boolean',
        description: 'output transpiled css into the js module',
    })
    .option('optimize', {
        type: 'boolean',
        description: 'removes: empty nodes, stylable directives, comments',
        alias: 'o',
    })
    .option('minify', {
        type: 'boolean',
        description: 'minify generated css',
        alias: 'm',
    })
    .option('indexFile', {
        type: 'string',
        description: 'filename of the generated index',
    })
    .option('manifest', {
        type: 'boolean',
        description: 'should output manifest file',
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
    })
    .option('diagnostics', {
        type: 'boolean',
        description: 'print verbose diagnostics',
    })
    .option('diagnosticsMode', {
        alias: 'dm',
        type: 'string',
        description:
            'determine the diagnostics mode. if strict process will exit on any exception, loose will attempt to finish the process regardless of exceptions',
        default: 'strict' as 'strict' | 'loose',
        choices: ['strict', 'loose'],
    })
    .option('watch', {
        alias: 'w',
        type: 'boolean',
        description: 'enable watch mode',
        default: false,
    })
    .alias('h', 'help')
    .alias('v', 'version')
    .help()
    .strict()
    .wrap(yargs.terminalWidth())
    .parseSync();

async function main() {
    const defaultOptions = resolveDefaultOptions();
    const cliOptions = resolveCliOptions(argv, defaultOptions);

    const { options } = projectConfig(defaultOptions, cliOptions);
    const { dts, dtsSourceMap, log } = options;
    const { watch, require: requires } = argv;

    log('[Options]', options);

    if (!dts && dtsSourceMap) {
        throw new Error(`"dtsSourceMap" requires turning on "dts"`);
    }
    // execute all require hooks before running the CLI build
    for (const request of requires) {
        if (request) {
            require(request);
        }
    }

    await build({ ...options, watch });
}

main().catch((e) => {
    process.exitCode = 1;
    console.error(e);
});
