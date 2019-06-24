import {
    cachedProcessFile,
    createMinimalFS,
    Diagnostics,
    FileProcessor,
    postProcessor,
    process,
    processNamespace,
    replaceValueHook,
    Stylable,
    StylableMeta,
    StylableResolver,
    StylableResults,
    StylableTransformer
} from '@stylable/core';
import { isAbsolute } from 'path';
import postcss from 'postcss';


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

    const fileProcessor = cachedProcessFile<StylableMeta>(
        (from, content) => {
            const meta = process(postcss.parse(content, { from }), diagnostics);
            meta.namespace = config.files[from].namespace || meta.namespace;
            return meta;
        },
        fs,
        x => x
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
        mode: config.mode
    });
}

export function processSource(
    source: string,
    options: { from?: string } = {},
    resolveNamespace?: typeof processNamespace
) {
    return process(postcss.parse(source, options), undefined, resolveNamespace);
}

export function generateFromMock(
    config: Config,
    diagnostics: Diagnostics = new Diagnostics()
): StylableResults {
    if (!isAbsolute(config.entry || '')) {
        throw new Error('entry must be absolute path: ' + config.entry);
    }
    const entry = config.entry;

    const t = createTransformer(config, diagnostics);

    const result = t.transform(t.fileProcessor.process(entry || ''));

    return result;
}

export function createProcess(
    fileProcessor: FileProcessor<StylableMeta>
): (path: string) => StylableMeta {
    return (path: string) => fileProcessor.process(path);
}

/* LEGACY */
export function createTransform(
    fileProcessor: FileProcessor<StylableMeta>,
    requireModule: RequireType
): (meta: StylableMeta) => StylableMeta {
    return (meta: StylableMeta) => {
        return new StylableTransformer({
            fileProcessor,
            requireModule,
            diagnostics: new Diagnostics(),
            keepValues: false
        }).transform(meta).meta;
    };
}

export function generateStylableResult(config: Config) {
    return generateFromMock(config);
}

export function generateStylableRoot(config: Config) {
    return generateFromMock(config).meta.outputAst!;
}

export function generateStylableExports(config: Config) {
    return generateFromMock(config).exports;
}

export function createStylableInstance(config: Config) {
    config.trimWS = true;

    const { fs, requireModule } = createMinimalFS(config);

    const stylable = new Stylable(
        '/',
        fs as any,
        requireModule,
        '__',
        (meta, path) => {
            meta.namespace = config.files[path].namespace || meta.namespace;
            return meta;
        },
        undefined,
        undefined,
        config.resolve
    );

    return stylable;
}
