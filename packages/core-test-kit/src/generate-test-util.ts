import {
    createMinimalFS,
    Diagnostics,
    FileProcessor,
    postProcessor,
    process,
    processNamespace,
    replaceValueHook,
    StylableMeta,
    StylableResolver,
    StylableTransformer,
    createInfrastructure,
} from '@stylable/core';
import { isAbsolute } from 'path';
import * as postcss from 'postcss';

export interface File {
    content: string;
    mtime?: Date;
    namespace?: string;
}

export interface InfraConfig {
    files: Record<string, File>;
    trimWS?: boolean;
}

export interface Config {
    entry?: string;
    files: Record<string, File>;
    usedFiles?: string[];
    trimWS?: boolean;
    optimize?: boolean;
    resolve?: any;
    mode?: 'production' | 'development';
}

export type RequireType = (path: string) => any;

export function generateInfra(
    config: InfraConfig,
    diagnostics: Diagnostics = new Diagnostics()
): {
    resolver: StylableResolver;
    requireModule: RequireType;
    fileProcessor: FileProcessor<StylableMeta>;
} {
    const { fs, requireModule } = createMinimalFS(config);
    const { fileProcessor } = createInfrastructure(
        '/',
        fs,
        (meta, filePath) => {
            meta.namespace = config.files[filePath].namespace || meta.namespace;
            return meta;
        },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        () => diagnostics
    );
    const resolver = new StylableResolver(fileProcessor, requireModule);

    return { resolver, requireModule, fileProcessor };
}

export function createTransformer(
    config: Config,
    diagnostics: Diagnostics = new Diagnostics(),
    replaceValueHook?: replaceValueHook,
    postProcessor?: postProcessor
): StylableTransformer {
    const { requireModule, fileProcessor } = generateInfra(config, diagnostics);

    return new StylableTransformer({
        fileProcessor,
        requireModule,
        diagnostics,
        keepValues: false,
        replaceValueHook,
        postProcessor,
        mode: config.mode,
    });
}

export function processSource(
    source: string,
    options: { from?: string } = {},
    resolveNamespace?: typeof processNamespace
) {
    return process(postcss.parse(source, options), undefined, resolveNamespace);
}

export function createProcess(
    fileProcessor: FileProcessor<StylableMeta>
): (path: string) => StylableMeta {
    return (path: string) => fileProcessor.process(path);
}

export function generateStylableResult(
    config: Config,
    diagnostics: Diagnostics = new Diagnostics()
) {
    const { entry } = config;
    if (!isAbsolute(entry || '')) {
        throw new Error(`entry must be absolute path got: ${entry}`);
    }
    const transformer = createTransformer(config, diagnostics);
    return transformer.transform(transformer.fileProcessor.process(entry || ''));
}

export function generateStylableRoot(config: Config) {
    return generateStylableResult(config).meta.outputAst!;
}

export function generateStylableExports(config: Config) {
    return generateStylableResult(config).exports;
}
