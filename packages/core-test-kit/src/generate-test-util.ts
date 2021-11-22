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
    createStylableFileProcessor,
    createDefaultResolver,
    Stylable,
    StylableConfig,
} from '@stylable/core';
import { isAbsolute } from 'path';
import * as postcss from 'postcss';
import { createMemoryFs } from '@file-services/memory';
import type { IDirectoryContents } from '@file-services/types';

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

export function generateInfra(config: InfraConfig, diagnostics: Diagnostics = new Diagnostics()) {
    const { fs, requireModule } = createMinimalFS(config);
    const fileProcessor = createStylableFileProcessor({
        fileSystem: fs,
        onProcess: (meta, filePath) => {
            meta.namespace = config.files[filePath].namespace || meta.namespace;
            return meta;
        },
        createDiagnostics: () => diagnostics,
    });

    const resolveModule = createDefaultResolver(fs, {});
    const resolvePath = (context: string | undefined = '/', moduleId: string) =>
        resolveModule(context, moduleId);

    const resolver = new StylableResolver(fileProcessor, requireModule, resolvePath);

    return { resolver, requireModule, fileProcessor, resolvePath };
}

export function createTransformer(
    config: Config,
    diagnostics: Diagnostics = new Diagnostics(),
    replaceValueHook?: replaceValueHook,
    postProcessor?: postProcessor
): StylableTransformer {
    const { requireModule, fileProcessor, resolvePath } = generateInfra(config, diagnostics);

    return new StylableTransformer({
        fileProcessor,
        moduleResolver: resolvePath,
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

export function generateStyleableEnvironment(
    content: IDirectoryContents,
    stylableConfig: Partial<StylableConfig> = {}
) {
    const fs = createMemoryFs(content);

    const stylable = Stylable.create({
        fileSystem: fs,
        projectRoot: '/',
        resolveNamespace: (ns) => ns,
        ...stylableConfig,
    });

    return {
        stylable,
        fs,
    };
}
