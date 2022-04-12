import type { CacheItem, FileProcessor, MinimalFS } from './cached-process-file';
import { createStylableFileProcessor } from './create-stylable-processor';
import { Diagnostics } from './diagnostics';
import { CssParser, cssParse } from './parser';
import { processNamespace, StylableProcessor } from './stylable-processor';
import type { StylableMeta } from './stylable-meta';
import { StylableResolverCache, StylableResolver, CachedModuleEntity } from './stylable-resolver';
import {
    StylableResults,
    StylableTransformer,
    TransformerOptions,
    TransformHooks,
} from './stylable-transformer';
import type { IStylableOptimizer, ModuleResolver } from './types';
import { createDefaultResolver } from './module-resolver';
import { warnOnce } from './helpers/deprecation';
import { STVar } from './features';
import { MetaDependency, visitMetaCSSDependencies } from './visit-meta-css-dependencies';

export interface StylableConfig {
    projectRoot: string;
    fileSystem: MinimalFS;
    requireModule?: (path: string) => any;
    onProcess?: (meta: StylableMeta, path: string) => StylableMeta;
    hooks?: TransformHooks;
    resolveOptions?: {
        alias?: any;
        symlinks?: boolean;
        [key: string]: any;
    };
    optimizer?: IStylableOptimizer;
    mode?: 'production' | 'development';
    resolveNamespace?: typeof processNamespace;
    resolveModule?: ModuleResolver;
    cssParser?: CssParser;
    resolverCache?: StylableResolverCache;
    fileProcessorCache?: Record<string, CacheItem<StylableMeta>>;
}

interface InitCacheParams {
    /* Keeps cache entities that meet the condition specified in a callback function. Return `true` to keep the iterated entity. */
    filter?(key: string, entity: CachedModuleEntity): boolean;
}

export type CreateProcessorOptions = Pick<StylableConfig, 'resolveNamespace'>;

export class Stylable {
    public fileProcessor: FileProcessor<StylableMeta>;
    public resolver: StylableResolver;
    public stVar = new STVar.StylablePublicApi(this);
    //
    public projectRoot: string;
    protected fileSystem: MinimalFS;
    protected requireModule: (path: string) => any;
    public delimiter = '__'; // ToDo: remove
    protected onProcess?: (meta: StylableMeta, path: string) => StylableMeta;
    protected diagnostics = new Diagnostics();
    protected hooks: TransformHooks;
    protected resolveOptions: any;
    public optimizer?: IStylableOptimizer;
    protected mode: 'production' | 'development';
    public resolveNamespace?: typeof processNamespace;
    public resolvePath: ModuleResolver;
    protected cssParser: CssParser;
    protected resolverCache?: StylableResolverCache;
    // This cache is fragile and should be fresh if onProcess/resolveNamespace/cssParser is different
    protected fileProcessorCache?: Record<string, CacheItem<StylableMeta>>;
    constructor(config: StylableConfig) {
        this.projectRoot = config.projectRoot;
        this.fileSystem = config.fileSystem;
        this.requireModule =
            config.requireModule ||
            (() => {
                throw new Error('Javascript files are not supported without requireModule options');
            });
        this.onProcess = config.onProcess;
        this.hooks = config.hooks || {};
        this.resolveOptions = config.resolveOptions || {};
        this.optimizer = config.optimizer;
        this.mode = config.mode || `production`;
        this.resolveNamespace = config.resolveNamespace;
        this.resolvePath =
            config.resolveModule || createDefaultResolver(this.fileSystem, this.resolveOptions);
        this.cssParser = config.cssParser || cssParse;
        this.resolverCache = config.resolverCache;
        this.fileProcessorCache = config.fileProcessorCache;

        this.fileProcessor = createStylableFileProcessor({
            fileSystem: this.fileSystem,
            onProcess: this.onProcess,
            resolveNamespace: this.resolveNamespace,
            cssParser: this.cssParser,
            cache: this.fileProcessorCache,
        });

        this.resolver = this.createResolver();
    }
    public getDependencies(meta: StylableMeta) {
        const dependencies: MetaDependency[] = [];

        for (const dependency of visitMetaCSSDependencies({ meta, resolver: this.resolver })) {
            dependencies.push(dependency);
        }

        return dependencies;
    }
    public initCache({ filter }: InitCacheParams = {}) {
        if (filter && this.resolverCache) {
            for (const [key, cacheEntity] of this.resolverCache) {
                const keep = filter(key, cacheEntity);

                if (!keep) {
                    this.resolverCache.delete(key);
                }
            }
        } else {
            this.resolverCache = new Map();
            this.resolver = this.createResolver();
        }
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
    public process(fullPath: string, ignoreCache = false): StylableMeta {
        if (typeof ignoreCache === 'string') {
            warnOnce(
                'Stylable.process with context as second arguments is deprecated please resolve the fullPath with Stylable.resolvePath before using'
            );
        }
        return this.fileProcessor.process(fullPath, ignoreCache);
    }
}
