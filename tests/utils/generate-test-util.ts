import { isAbsolute } from 'path';
import * as postcss from 'postcss';
import { Bundler } from '../../src/bundle';
import { cachedProcessFile, FileProcessor } from '../../src/cached-process-file';
import { Diagnostics } from '../../src/diagnostics';
import { createMinimalFS } from '../../src/memory-minimal-fs';
import { Stylable } from '../../src/stylable';
import { process, StylableMeta } from '../../src/stylable-processor';
import { StylableResolver } from '../../src/stylable-resolver';
import { postProcessor, replaceValueHook, StylableResults, StylableTransformer } from '../../src/stylable-transformer';

import { Pojo } from '../../src/types';

export interface File {
    content: string;
    mtime?: Date;
    namespace?: string;
}

export interface InfraConfig {
    files: Pojo<File>;
    trimWS?: boolean;
}

export interface Config {
    entry?: string;
    scopeRoot?: boolean;
    files: Pojo<File>;
    usedFiles?: string[];
    trimWS?: boolean;
    optimize?: boolean;
}

export type RequireType = (path: string) => any;

export function generateInfra(config: InfraConfig, diagnostics: Diagnostics = new Diagnostics()): {
    resolver: StylableResolver, requireModule: RequireType, fileProcessor: FileProcessor<StylableMeta>
} {
    const { fs, requireModule } = createMinimalFS(config);

    const fileProcessor = cachedProcessFile<StylableMeta>((from, content) => {
        const meta = process(postcss.parse(content, { from }), diagnostics);
        meta.namespace = config.files[from].namespace || meta.namespace;
        return meta;
    }, fs);

    const resolver = new StylableResolver(fileProcessor, requireModule);

    return { resolver, requireModule, fileProcessor };
}

export function createTransformer(
    config: Config,
    diagnostics: Diagnostics = new Diagnostics(),
    replaceValueHook?: replaceValueHook, postProcessor?: postProcessor): StylableTransformer {

    const { requireModule, fileProcessor } = generateInfra(config, diagnostics);

    return new StylableTransformer({
        fileProcessor,
        requireModule,
        diagnostics,
        keepValues: false,
        optimize: config.optimize,
        replaceValueHook,
        postProcessor,
        scopeRoot: !!config.scopeRoot
    });
}

export function generateFromMock(config: Config, diagnostics: Diagnostics = new Diagnostics()): StylableResults {
    if (!isAbsolute(config.entry || '')) {
        throw new Error('entry must be absolute path: ' + config.entry);
    }
    const entry = config.entry;

    const t = createTransformer(config, diagnostics);

    const result = t.transform(t.fileProcessor.process(entry || ''));

    return result;
}

export function createProcess(fileProcessor: FileProcessor<StylableMeta>): (path: string) => StylableMeta {
    return (path: string) => fileProcessor.process(path);
}

/* LEGACY */
export function createTransform(
    fileProcessor: FileProcessor<StylableMeta>, requireModule: RequireType): (meta: StylableMeta) => StylableMeta {
    return (meta: StylableMeta) => {
        return new StylableTransformer({
            fileProcessor,
            requireModule,
            diagnostics: new Diagnostics(),
            keepValues: false,
            scopeRoot: false
        }).transform(meta).meta;
    };
}

export function generateStylableRoot(config: Config) {
    return generateFromMock(config).meta.outputAst!;
}

export function generateStylableExports(config: Config) {
    return generateFromMock(config).exports;
}

export function createTestBundler(config: Config) {
    config.trimWS = true;
    if (!config.usedFiles) {
        throw new Error('usedFiles is not optional in generateStylableOutput');
    }

    const { fs, requireModule } = createMinimalFS(config);

    const stylable = new Stylable('/', fs as any, requireModule, '--', (meta, path) => {
        meta.namespace = config.files[path].namespace || meta.namespace;
        return meta;
    }, undefined, undefined, !!config.scopeRoot);

    return new Bundler(stylable);
}

export function generateStylableOutput(config: Config) {
    config.trimWS = true;
    if (!config.usedFiles) {
        throw new Error('usedFiles is not optional in generateStylableOutput');
    }
    const bundler = createTestBundler(config);

    config.usedFiles.forEach(path => bundler.addUsedFile(path));

    return bundler.generateCSS();
    // return bundle(config.usedFiles, resolver, createProcess(fileProcessor),
    //               createTransform(fileProcessor, requireModule), (_ctx: string, path: string) => path).css;
}
