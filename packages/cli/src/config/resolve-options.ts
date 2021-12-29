import { nodeFs } from '@file-services/node';
import type { Arguments } from 'yargs';
import yargs from 'yargs';
import { createGenerator } from '../build';
import { removeUndefined } from '../helpers';
import type { CliArguments, BuildOptions, PartialBuildOptions } from '../types';

const { join } = nodeFs;

export function getCliArguments(): Arguments<CliArguments> {
    const defaults = createDefaultOptions();
    return yargs
        .usage('$0 [options]')
        .option('rootDir', {
            type: 'string',
            description: 'root directory of project',
            default: process.cwd(),
            defaultDescription: 'current working directory',
        })
        .option('srcDir', {
            type: 'string',
            description: 'source directory relative to root',
            defaultDescription: defaults.srcDir,
        })
        .option('outDir', {
            type: 'string',
            description: 'target directory relative to root',
            defaultDescription: defaults.outDir,
        })
        .option('esm', {
            type: 'boolean',
            description: 'output esm module (.mjs)',
            defaultDescription: String(defaults.esm),
        })
        .option('cjs', {
            type: 'boolean',
            description: 'output commonjs module (.js)',
            defaultDescription: String(defaults.cjs),
        })
        .option('css', {
            type: 'boolean',
            description: 'output transpiled css (.css)',
            defaultDescription: String(defaults.outputCSS),
        })
        .option('stcss', {
            type: 'boolean',
            description: 'output stylable sources (.st.css)',
            defaultDescription: String(defaults.outputSources),
        })
        .option('dts', {
            type: 'boolean',
            description: 'output stylable definition files for sources (.st.css.d.ts)',
            defaultDescription: String(defaults.dts),
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
            description:
                'node request to a module that exports a stylable resolveNamespace function',
            alias: 'nsr',
            default: '@stylable/node',
        })
        .option('injectCSSRequest', {
            type: 'boolean',
            description: 'add a static import for the generated css in the js module output',
            alias: 'icr',
            defaultDescription: String(defaults.injectCSSRequest),
        })
        .option('cssFilename', {
            type: 'string',
            description: 'pattern of the generated css file',
            defaultDescription: defaults.outputCSSNameTemplate,
        })
        .option('cssInJs', {
            type: 'boolean',
            description: 'output transpiled css into the js module',
            defaultDescription: String(defaults.includeCSSInJS),
        })
        .option('optimize', {
            type: 'boolean',
            description: 'removes: empty nodes, stylable directives, comments',
            alias: 'o',
            defaultDescription: String(defaults.optimize),
        })
        .option('minify', {
            type: 'boolean',
            description: 'minify generated css',
            alias: 'm',
            defaultDescription: String(defaults.minify),
        })
        .option('indexFile', {
            type: 'string',
            description: 'filename of the generated index',
            defaultDescription: String(defaults.indexFile),
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
        .option('require', {
            type: 'array',
            description: 'require hooks',
            alias: 'r',
            default: [] as string[],
        })
        .option('log', {
            type: 'boolean',
            description: 'verbose log',
            defaultDescription: 'false',
        })
        .option('diagnostics', {
            type: 'boolean',
            description: 'print verbose diagnostics',
            defaultDescription: String(defaults.diagnostics),
        })
        .option('diagnosticsMode', {
            alias: 'dm',
            type: 'string',
            description:
                'determine the diagnostics mode. if strict process will exit on any exception, loose will attempt to finish the process regardless of exceptions',
            defaultDescription: defaults.diagnosticsMode,
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
}

export function resolveCliOptions(argv: CliArguments, defaults: BuildOptions): PartialBuildOptions {
    const rootDir = argv.rootDir;
    const outDir = argv.outDir ?? defaults.outDir;

    return {
        outDir: argv.outDir,
        srcDir: argv.srcDir,
        indexFile: argv.indexFile,
        esm: argv.esm,
        cjs: argv.cjs,
        dts: argv.dts,
        dtsSourceMap: argv.dtsSourceMap ?? argv.dts,
        injectCSSRequest: argv.injectCSSRequest,
        optimize: argv.optimize,
        minify: argv.minify,
        manifest: argv.manifest ? join(rootDir, outDir, argv.manifestFilepath) : undefined,
        useNamespaceReference: argv.useNamespaceReference,
        diagnostics: argv.diagnostics,
        outputCSS: argv.css,
        includeCSSInJS: argv.cssInJs,
        outputSources: argv.stcss,
        outputCSSNameTemplate: argv.cssFilename,
        diagnosticsMode: argv.diagnosticsMode as BuildOptions['diagnosticsMode'],
        IndexGenerator: createGenerator(rootDir, argv.customGenerator),
    };
}

export function createDefaultOptions(): BuildOptions {
    return {
        outDir: '.',
        srcDir: '.',
        cjs: true,
        esm: false,
        dts: false,
        dtsSourceMap: false,
        injectCSSRequest: false,
        optimize: false,
        minify: false,
        useNamespaceReference: false,
        diagnostics: true,
        outputCSS: false,
        includeCSSInJS: false,
        outputSources: false,
        outputCSSNameTemplate: '[filename].css',
        diagnosticsMode: 'strict',
    };
}

export function validateOptions(
    { outDir, srcDir, outputSources, dts, dtsSourceMap }: BuildOptions,
    name?: string
) {
    const prefix = name ? `"${name}" options - ` : '';

    if (!dts && dtsSourceMap) {
        throw new Error(prefix + `"dtsSourceMap" requires turning on "dts"`);
    }

    if (outputSources && srcDir === outDir) {
        throw new Error(
            prefix +
                'Invalid configuration: When using "stcss" outDir and srcDir must be different.' +
                `\noutDir: ${outDir}` +
                `\nsrcDir: ${srcDir}`
        );
    }
}

export function mergeBuildOptions(
    ...configs: [BuildOptions, ...(BuildOptions | PartialBuildOptions | undefined)[]]
): BuildOptions {
    const [config, ...rest] = configs;

    return Object.assign(
        {},
        config,
        ...rest.map((currentConfig) => (currentConfig ? removeUndefined(currentConfig) : {}))
    );
}

export function createBuildIdentifier(
    rootDir: string,
    projectRoot: string,
    index: number,
    hasMultipleOptions: boolean,
    isMultipleProjects: boolean
) {
    return hasMultipleOptions
        ? `[${index}] ${projectRoot.replace(rootDir, '')}`
        : isMultipleProjects
        ? projectRoot.replace(rootDir, '')
        : projectRoot;
}
