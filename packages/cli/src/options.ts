import type { ConfigOptions, PartialConfigOptions } from './project-config';
import type { Arguments } from 'yargs';
import { nodeFs } from '@file-services/node';
import { Stylable } from '@stylable/core';
import { createLogger } from './logger';

const { join, resolve } = nodeFs;

export interface CliArguments {
    rootDir: string | undefined;
    srcDir: string | undefined;
    outDir: string | undefined;
    esm: boolean | undefined;
    cjs: boolean | undefined;
    css: boolean | undefined;
    stcss: boolean | undefined;
    dts: boolean | undefined;
    dtsSourceMap: boolean | undefined;
    useNamespaceReference: boolean | undefined;
    namespaceResolver: string;
    injectCSSRequest: boolean | undefined;
    cssFilename: string | undefined;
    cssInJs: boolean | undefined;
    optimize: boolean | undefined;
    minify: boolean | undefined;
    indexFile: string | undefined;
    manifest: boolean | undefined;
    manifestFilepath: string;
    customGenerator: string | undefined;
    ext: string | undefined;
    require: string[];
    log: boolean | undefined;
    diagnostics: boolean | undefined;
    diagnosticsMode: string | undefined;
    watch: boolean;
}

export function resolveCliOptions(
    argv: Arguments<CliArguments>,
    defaults: ConfigOptions
): PartialConfigOptions {
    const log = createLogger('[Stylable]', argv.log ?? false);
    const rootDir = argv.rootDir ?? defaults.rootDir;
    const outDir = argv.outDir ?? defaults.outDir;
    const moduleFormats = [
        ...new Set([
            ...(defaults.moduleFormats || []),
            ...getModuleFormats({ esm: argv.esm || false, cjs: argv.cjs || true }),
        ]),
    ];

    log('[CLI Arguments]', argv);

    return removeUndefined({
        rootDir,
        outDir: argv.outDir,
        srcDir: argv.srcDir,
        extension: argv.ext,
        indexFile: argv.indexFile,
        moduleFormats,
        dts: argv.dts,
        dtsSourceMap: argv.dtsSourceMap ?? argv.dts,
        injectCSSRequest: argv.injectCSSRequest,
        optimize: argv.optimize,
        minify: argv.minify,
        manifest: argv.manifest ? join(rootDir, outDir, argv.manifestFilepath) : undefined,
        useNamespaceReference: argv.useNamespaceReference,
        diagnostics: argv.diagnostics,
        fs: nodeFs,
        log,
        generatorPath:
            argv.customGenerator !== undefined
                ? resolve(argv.customGenerator)
                : argv.customGenerator,
        outputCSS: argv.css,
        includeCSSInJS: argv.cssInJs,
        outputSources: argv.stcss,
        outputCSSNameTemplate: argv.cssFilename,
        diagnosticsMode: argv.diagnosticsMode as ConfigOptions['diagnosticsMode'],
        stylable: argv.namespaceResolver
            ? Stylable.create({
                  fileSystem: nodeFs,
                  requireModule: require,
                  projectRoot: rootDir,
                  resolveNamespace: require(argv.namespaceResolver).resolveNamespace,
                  resolverCache: new Map(),
              })
            : undefined,
    });
}

export function resolveDefaultOptions(): ConfigOptions {
    const rootDir = process.cwd();
    const outDir = '.';
    const esm = false;
    const cjs = true;
    const log = createLogger('[Stylable]', false);

    return {
        rootDir,
        outDir,
        srcDir: '.',
        extension: '.st.css',
        moduleFormats: getModuleFormats({ esm, cjs }),
        dts: false,
        dtsSourceMap: false,
        injectCSSRequest: false,
        optimize: false,
        minify: false,
        useNamespaceReference: false,
        diagnostics: true,
        fs: nodeFs,
        log,
        outputCSS: false,
        includeCSSInJS: false,
        outputSources: false,
        outputCSSNameTemplate: '[filename].css',
        diagnosticsMode: 'strict',
        stylable: Stylable.create({
            fileSystem: nodeFs,
            requireModule: require,
            projectRoot: rootDir,
            resolveNamespace: require('@stylable/node').resolveNamespace,
            resolverCache: new Map(),
        }),
    };
}

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

function removeUndefined<T extends object>(obj: T) {
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => typeof value !== 'undefined')
    ) as Exclude<T, undefined>;
}
