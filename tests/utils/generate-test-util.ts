import { Pojo } from "../../src/types";
import { cachedProcessFile, FileProcessor } from "../../src/cached-process-file";
import { StylableMeta, process } from "../../src/stylable-processor";
import * as postcss from 'postcss';
import { StylableTransformer, StylableResults } from "../../src/stylable-transformer";
import { StylableResolver } from "../../src/postcss-resolver";
import { Diagnostics } from "../../src/diagnostics";
import { createMinimalFS } from "../../src/memory-minimal-fs";
import { bundle } from "../../src/bundle";
import { isAbsolute } from "path";
// const deindent = require('deindent');
export interface File { content: string; mtime?: Date; namespace?: string }
export interface InfraConfig { files: Pojo<File> }
export interface Config { entry: string, files: Pojo<File>, usedFiles?: string[] }
export type RequireType = (path:string) => any;
export function generateInfra(config:InfraConfig):{resolver:StylableResolver, requireModule:RequireType, fileProcessor:FileProcessor<StylableMeta>}{
    const { fs, requireModule } = createMinimalFS(config);
    
    const fileProcessor = cachedProcessFile<StylableMeta>((from, content) => {
        const meta = process(postcss.parse(content, { from }));
        meta.namespace = config.files[from].namespace || meta.namespace;
        return meta;
    }, fs);

    const resolver = new StylableResolver(fileProcessor, requireModule); 

    return { resolver, requireModule, fileProcessor };
}

export function generateFromMock(config: Config, resolver?:StylableResolver):StylableResults {
    if (!isAbsolute(config.entry)) {
        throw new Error('entry must be absolute path: ' + config.entry)
    }
    const entry = config.entry;
    
    const { requireModule, fileProcessor } = generateInfra(config);

    const t = new StylableTransformer({
        fileProcessor,
        requireModule,
        diagnostics: new Diagnostics(),
        keepValues: false
    });
    resolver && t.setResolver(resolver); /*ToDo: pass through options... */

    const result = t.transform(fileProcessor.process(entry));

    return result;
}

export function createProcess(fileProcessor:FileProcessor<StylableMeta>):(path:string) => StylableResults {
    return (path:string) => ({meta:fileProcessor.process(path), exports:{}});
}

export function createTransform(fileProcessor:FileProcessor<StylableMeta>, requireModule:RequireType):(meta:StylableMeta) => StylableMeta {
    return (meta:StylableMeta) => {
        return new StylableTransformer({
            fileProcessor,
            requireModule,
            diagnostics: new Diagnostics(),
            keepValues: false
        }).transform(meta).meta;
    };
}

export function generateStylableRoot(config: Config) {
    return generateFromMock(config).meta.ast;
}

export function generateStylableExports(config: Config) {
    return generateFromMock(config).exports;
}

export function generateStylableOutput(config: Config) {
    if (!config.usedFiles) {
        throw new Error('usedFiles is not optional in generateStylableOutput');
    }

    const { resolver, fileProcessor, requireModule } = generateInfra(config);
    
    return bundle(config.usedFiles, resolver, createProcess(fileProcessor), createTransform(fileProcessor, requireModule)).css;
}
