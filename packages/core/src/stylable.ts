import type { CacheItem, FileProcessor, MinimalFS } from './cached-process-file';
import { createStylableFileProcessor } from './create-infra-structure';
import { Diagnostics } from './diagnostics';
import { CssParser, cssParse } from './parser';
import { processNamespace, StylableProcessor } from './stylable-processor';
import type { StylableMeta } from './stylable-meta';
import { StylableResolverCache, StylableResolver } from './stylable-resolver';
import {
    StylableResults,
    StylableTransformer,
    TransformerOptions,
    TransformHooks,
} from './stylable-transformer';
import type { TimedCacheOptions } from './timed-cache';
import type { IStylableOptimizer, ModuleResolver } from './types';
import { createDefaultResolver } from './module-resolver';

export interface StylableConfig {
    projectRoot: string;
    fileSystem: MinimalFS;
    requireModule?: (path: string) => any;
    /** @deprecated */
    delimiter?: string;
    onProcess?: (meta: StylableMeta, path: string) => StylableMeta;
    /** @deprecated */
    diagnostics?: Diagnostics;
    hooks?: TransformHooks;
    resolveOptions?: {
        alias?: any;
        symlinks?: boolean;
        [key: string]: any;
    };
    optimizer?: IStylableOptimizer;
    mode?: 'production' | 'development';
    resolveNamespace?: typeof processNamespace;
    /** @deprecated use resolverCache instead */
    timedCacheOptions?: Omit<TimedCacheOptions, 'createKey'>;
    resolveModule?: ModuleResolver;
    cssParser?: CssParser;
    resolverCache?: StylableResolverCache;
    fileProcessorCache?: Record<string, CacheItem<StylableMeta>>;
}

export type CreateProcessorOptions = Pick<StylableConfig, 'resolveNamespace'>;

export class Stylable {
    public static create(config: StylableConfig) {
        return new this(
            config.projectRoot,
            config.fileSystem,
            (id) => {
                if (config.requireModule) {
                    return config.requireModule(id);
                }
                throw new Error('Javascript files are not supported without requireModule options');
            },
            config.delimiter,
            config.onProcess,
            config.diagnostics,
            config.hooks,
            config.resolveOptions,
            config.optimizer,
            config.mode,
            config.resolveNamespace,
            config.timedCacheOptions,
            config.resolveModule,
            config.cssParser,
            config.resolverCache,
            config.fileProcessorCache
        );
    }
    public fileProcessor: FileProcessor<StylableMeta>;
    public resolver: StylableResolver;
    constructor(
        public projectRoot: string,
        protected fileSystem: MinimalFS,
        protected requireModule: (path: string) => any,
        public delimiter: string = '__',
        protected onProcess?: (meta: StylableMeta, path: string) => StylableMeta,
        protected diagnostics = new Diagnostics(),
        protected hooks: TransformHooks = {},
        protected resolveOptions: any = {},
        public optimizer?: IStylableOptimizer,
        protected mode: 'production' | 'development' = 'production',
        public resolveNamespace?: typeof processNamespace,
        protected timedCacheOptions?: Omit<TimedCacheOptions, 'createKey'>,
        public resolvePath: ModuleResolver = createDefaultResolver(fileSystem, resolveOptions),
        protected cssParser: CssParser = cssParse,
        protected resolverCache?: StylableResolverCache,
        // TODO: add comment
        protected fileProcessorCache?: Record<string, CacheItem<StylableMeta>>
    ) {
        this.fileProcessor = createStylableFileProcessor(
            fileSystem,
            onProcess,
            this.resolveNamespace,
            cssParser,
            this.fileProcessorCache
        );

        this.resolver = this.createResolver();
    }
    public initCache() {
        this.resolverCache = new Map();
        this.resolver = this.createResolver();
    }
    public createResolver({
        requireModule = this.requireModule,
        resolverCache = this.resolverCache,
        resolvePath = this.resolvePath,
    }: Pick<StylableConfig, 'requireModule' | 'resolverCache'> & {
        resolvePath?: ModuleResolver;
    } = {}) {
        return new StylableResolver(this.fileProcessor, requireModule, resolvePath, resolverCache);
    }
    public createProcessor({
        resolveNamespace = this.resolveNamespace,
    }: CreateProcessorOptions = {}) {
        return new StylableProcessor(new Diagnostics(), resolveNamespace);
    }
    public createTransformer(options: Partial<TransformerOptions> = {}) {
        return new StylableTransformer({
            delimiter: this.delimiter,
            moduleResolver: this.resolvePath,
            diagnostics: new Diagnostics(),
            fileProcessor: this.fileProcessor,
            requireModule: this.requireModule,
            postProcessor: this.hooks.postProcessor,
            replaceValueHook: this.hooks.replaceValueHook,
            resolverCache: this.resolverCache,
            mode: this.mode,
            ...options,
        });
    }
    public transform(meta: StylableMeta): StylableResults;
    public transform(source: string, resourcePath: string): StylableResults;
    public transform(
        meta: string | StylableMeta,
        resourcePath?: string,
        options: Partial<TransformerOptions> = {},
        processorOptions: CreateProcessorOptions = {}
    ): StylableResults {
        if (typeof meta === 'string') {
            meta = this.createProcessor(processorOptions).process(
                this.cssParser(meta, { from: resourcePath })
            );
        }
        const transformer = this.createTransformer(options);
        this.fileProcessor.add(meta.source, meta);
        return transformer.transform(meta);
    }
    // TODO: Think about breaking here
    public process(fullPath: string, _context?: never, ignoreCache?: boolean): StylableMeta {
        return this.fileProcessor.process(fullPath, ignoreCache);
    }
}
