import { Bundler } from './bundle';
import { FileProcessor, MinimalFS } from './cached-process-file';
import { Diagnostics } from './diagnostics';
import { StylableResolver } from './postcss-resolver';
import { StylableMeta } from './stylable-processor';
import { StylableResults } from './stylable-transformer';
export declare class Stylable {
    protected projectRoot: string;
    protected fileSystem: MinimalFS;
    protected requireModule: (path: string) => any;
    delimiter: string;
    protected onProcess: ((meta: StylableMeta, path: string) => StylableMeta) | undefined;
    protected diagnostics: Diagnostics;
    fileProcessor: FileProcessor<StylableMeta>;
    resolver: StylableResolver;
    resolvePath: (ctx: string, path: string) => string;
    constructor(projectRoot: string, fileSystem: MinimalFS, requireModule: (path: string) => any, delimiter?: string, onProcess?: ((meta: StylableMeta, path: string) => StylableMeta) | undefined, diagnostics?: Diagnostics);
    createBundler(): Bundler;
    transform(meta: StylableMeta): StylableResults;
    transform(source: string, resourcePath: string): StylableResults;
    process(fullpath: string): StylableMeta;
}
