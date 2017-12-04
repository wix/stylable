import * as postcss from 'postcss';
import { Bundler } from '../../src/bundle';
import { FileProcessor } from '../../src/cached-process-file';
import { Diagnostics } from '../../src/diagnostics';
import { StylableResolver } from '../../src/postcss-resolver';
import { StylableMeta } from '../../src/stylable-processor';
import { StylableResults, StylableTransformer } from '../../src/stylable-transformer';
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
    files: Pojo<File>;
    usedFiles?: string[];
    trimWS?: boolean;
    optimize?: boolean;
}
export declare type RequireType = (path: string) => any;
export declare function generateInfra(config: InfraConfig, diagnostics: Diagnostics): {
    resolver: StylableResolver;
    requireModule: RequireType;
    fileProcessor: FileProcessor<StylableMeta>;
};
export declare function createTransformer(config: Config, diagnostics?: Diagnostics): StylableTransformer;
export declare function generateFromMock(config: Config, diagnostics?: Diagnostics): StylableResults;
export declare function createProcess(fileProcessor: FileProcessor<StylableMeta>): (path: string) => StylableMeta;
export declare function createTransform(fileProcessor: FileProcessor<StylableMeta>, requireModule: RequireType): (meta: StylableMeta) => StylableMeta;
export declare function generateStylableRoot(config: Config): postcss.Root;
export declare function generateStylableExports(config: Config): Pojo<string>;
export declare function createTestBundler(config: Config): Bundler;
export declare function generateStylableOutput(config: Config): string;
