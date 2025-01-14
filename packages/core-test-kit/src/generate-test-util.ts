import {
    Diagnostics,
    type processNamespace,
    StylableMeta,
    Stylable,
    StylableConfig,
    createDefaultResolver,
} from '@stylable/core';
import { createJavascriptRequireModule } from './test-stylable-core.js';
import {
    FileProcessor,
    StylableProcessor,
    StylableResolver,
    StylableTransformer,
    createStylableFileProcessor,
    postProcessor,
    replaceValueHook,
    defaultFeatureFlags,
} from '@stylable/core/dist/index-internal';
import { isAbsolute } from 'path';
import * as postcss from 'postcss';
import { createMemoryFs } from '@file-services/memory';
import type { IFileSystem } from '@file-services/types';
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
    /**@deprecated defaults to false*/
    trimWS?: boolean;
    optimize?: boolean;
    resolve?: any;
    mode?: 'production' | 'development';
}

export type RequireType = (path: string) => any;

/**@deprecated use testStylableCore */
export function generateInfra(config: InfraConfig, diagnostics: Diagnostics = new Diagnostics()) {
    const files: Record<string, string> = {};
    for (const [path, { content }] of Object.entries(config.files)) {
        files[path] = content;
    }
    const fs = createMemoryFs(files);
    const requireModule = createJavascriptRequireModule(fs);
    const fileProcessor = createStylableFileProcessor({
        fileSystem: fs,
        onProcess: (meta, filePath) => {
            meta.namespace = config.files[filePath].namespace || meta.namespace;
            return meta;
        },
        createDiagnostics: () => diagnostics,
    });

    const resolveModule = createDefaultResolver({ fs });
    const resolvePath = (context: string | undefined = '/', moduleId: string) =>
        resolveModule(context, moduleId);

    const resolver = new StylableResolver(fileProcessor, requireModule, resolvePath);

    return { resolver, requireModule, fileProcessor, resolvePath };
}

interface CreateTransformerOptions {
    diagnostics?: Diagnostics;
    replaceValueHook?: replaceValueHook;
    postProcessor?: postProcessor;
    onResolve?: (resolved: string, _directoryPath: string, _request: string) => string;
}

export function createTransformer(
    config: Config,
    {
        diagnostics = new Diagnostics(),
        replaceValueHook,
        postProcessor,
        onResolve = (resolved) => resolved,
    }: CreateTransformerOptions = {},
): StylableTransformer {
    const { requireModule, fileProcessor, resolvePath } = generateInfra(config, diagnostics);

    return new StylableTransformer({
        fileProcessor,
        moduleResolver: (directoryPath: string, request: string) =>
            onResolve(resolvePath(directoryPath, request), directoryPath, request),
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
    resolveNamespace?: typeof processNamespace,
) {
    return new StylableProcessor(new Diagnostics(), resolveNamespace, {
        ...defaultFeatureFlags,
    }).process(postcss.parse(source, options));
}

export function createProcess(
    fileProcessor: FileProcessor<StylableMeta>,
): (path: string) => StylableMeta {
    return (path: string) => fileProcessor.process(path);
}

export function createResolveExtendsResults(
    fileSystem: IFileSystem,
    fileToProcess: string,
    classNameToLookup: string,
    isElement = false,
) {
    const stylable = new Stylable({
        fileSystem,
        projectRoot: '/',
    });

    return stylable.resolver.resolveExtends(
        stylable.analyze(fileToProcess),
        classNameToLookup,
        isElement,
    );
}

export function generateStylableResult(
    config: Config,
    diagnostics: Diagnostics = new Diagnostics(),
) {
    const { entry } = config;
    if (!isAbsolute(entry || '')) {
        throw new Error(`entry must be absolute path got: ${entry}`);
    }
    const transformer = createTransformer(config, { diagnostics });
    return transformer.transform(transformer.fileProcessor.process(entry || ''));
}

export function generateStylableRoot(config: Config) {
    return generateStylableResult(config).meta.targetAst!;
}

export function generateStylableExports(config: Config) {
    return generateStylableResult(config).exports;
}

export function generateStylableEnvironment(
    content: IDirectoryContents,
    stylableConfig: Partial<Omit<StylableConfig, 'fileSystem'>> = {},
) {
    const fs = createMemoryFs(content);

    const stylable = new Stylable({
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
