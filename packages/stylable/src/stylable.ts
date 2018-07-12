import { FileProcessor, MinimalFS } from './cached-process-file';
import { createInfrastructure } from './create-infra-structure';
import { Diagnostics } from './diagnostics';
import { StylableOptimizer } from './optimizer/stylable-optimizer';
import { safeParse } from './parser';
import { processNamespace, StylableMeta, StylableProcessor } from './stylable-processor';
import { StylableResolver } from './stylable-resolver';
import {
    Options,
    StylableResults,
    StylableTransformer,
    TransformHooks
} from './stylable-transformer';

export interface StylableConfig {
    projectRoot: string;
    fileSystem: MinimalFS;
    requireModule?: (path: string) => any;
    delimiter?: string;
    onProcess?: (meta: StylableMeta, path: string) => StylableMeta;
    diagnostics?: Diagnostics;
    hooks?: TransformHooks;
    scopeRoot?: boolean;
    resolveOptions?: {
        alias: any;
        symlinks: boolean;
        [key: string]: any;
    };
    optimizer?: StylableOptimizer;
    mode?: 'production' | 'development';
    resolveNamespace?: typeof processNamespace;
}

export class Stylable {
    public static create(config: StylableConfig) {
        return new this(
            config.projectRoot,
            config.fileSystem,
            id => {
                if (config.requireModule) {
                    return config.requireModule(id);
                }
                throw new Error('Javascript files are not supported without requireModule options');
            },
            config.delimiter,
            config.onProcess,
            config.diagnostics,
            config.hooks,
            config.scopeRoot,
            config.resolveOptions,
            config.optimizer,
            config.mode,
            config.resolveNamespace
        );
    }
    public fileProcessor: FileProcessor<StylableMeta>;
    public resolver: StylableResolver;
    public resolvePath: (ctx: string | undefined, path: string) => string;
    constructor(
        public projectRoot: string,
        protected fileSystem: MinimalFS,
        protected requireModule: (path: string) => any,
        public delimiter: string = '--',
        protected onProcess?: (meta: StylableMeta, path: string) => StylableMeta,
        protected diagnostics = new Diagnostics(),
        protected hooks: TransformHooks = {},
        protected scopeRoot: boolean = true,
        protected resolveOptions: any = {},
        protected optimizer?: StylableOptimizer,
        protected mode: 'production' | 'development' = 'production',
        protected resolveNamespace?: typeof processNamespace
    ) {
        const { fileProcessor, resolvePath } = createInfrastructure(
            projectRoot,
            fileSystem,
            onProcess,
            resolveOptions
        );
        this.resolvePath = resolvePath;
        this.fileProcessor = fileProcessor;
        this.resolver = new StylableResolver(this.fileProcessor, this.requireModule);
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
            mode: this.mode,
            ...options
        });
    }
    public transform(meta: StylableMeta): StylableResults;
    public transform(source: string, resourcePath: string): StylableResults;
    public transform(
        meta: string | StylableMeta,
        resourcePath?: string,
        options: Partial<Options> = {}
    ): StylableResults {
        if (typeof meta === 'string') {
            // TODO: refactor to use fileProcessor
            // meta = this.fileProcessor.processContent(meta, resourcePath + '');
            const root = safeParse(meta, { from: resourcePath });
            meta = new StylableProcessor(undefined, this.resolveNamespace).process(root);
        }
        const transformer = this.createTransformer(options);

        this.fileProcessor.add(meta.source, meta);

        return transformer.transform(meta);
    }
    public process(fullpath: string, context?: string, ignoreCache?: boolean): StylableMeta {
        return this.fileProcessor.process(fullpath, ignoreCache, context);
    }
}
