import { Bundler } from './bundle';
import { FileProcessor, MinimalFS } from './cached-process-file';
import { createInfrastructure } from './create-infra-structure';
import { Diagnostics } from './diagnostics';
import { safeParse } from './parser';
import { process, StylableMeta } from './stylable-processor';
import { StylableResolver } from './stylable-resolver';
import { Options, StylableResults, StylableTransformer, TransformHooks } from './stylable-transformer';

export class Stylable {
    public fileProcessor: FileProcessor<StylableMeta>;
    public resolver: StylableResolver;
    public resolvePath: (ctx: string, path: string) => string;
    constructor(
        protected projectRoot: string,
        protected fileSystem: MinimalFS,
        protected requireModule: (path: string) => any,
        public delimiter: string = '--',
        protected onProcess?: (meta: StylableMeta, path: string) => StylableMeta,
        protected diagnostics = new Diagnostics(),
        protected hooks: TransformHooks = {},
        protected scopeRoot: boolean = true) {

        const { fileProcessor, resolvePath } = createInfrastructure(projectRoot, fileSystem, onProcess);
        this.resolvePath = resolvePath;
        this.fileProcessor = fileProcessor;
        this.resolver = new StylableResolver(this.fileProcessor, this.requireModule);
    }
    public createBundler(): Bundler {
        return new Bundler(this);
    }
    public createTransformer(options: Partial<Options> = {}) {
        return new StylableTransformer({
            delimiter: this.delimiter,
            diagnostics: new Diagnostics(),
            fileProcessor: this.fileProcessor,
            requireModule: this.requireModule,
            postProcessor: this.hooks.postProcessor,
            replaceValueHook: this.hooks.replaceValueHook,
            scopeRoot: this.scopeRoot,
            ...options
        });
    }
    public transform(meta: StylableMeta): StylableResults;
    public transform(source: string, resourcePath: string): StylableResults;
    public transform(
        meta: string | StylableMeta,
        resourcePath?: string,
        options: Partial<Options> = {}): StylableResults {

        if (typeof meta === 'string') {
            const root = safeParse(meta, { from: resourcePath });
            meta = process(root, new Diagnostics());
        }

        const transformer = this.createTransformer(options);

        this.fileProcessor.add(meta.source, meta);

        return transformer.transform(meta);
    }
    public process(fullpath: string): StylableMeta {
        return this.fileProcessor.process(fullpath);
    }
}
