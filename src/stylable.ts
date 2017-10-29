import {Bundler} from './bundle';
import {FileProcessor, MinimalFS} from './cached-process-file';
import {createInfrastructure} from './create-infra-structure';
import {Diagnostics} from './diagnostics';
import {safeParse} from './parser';
import {StylableResolver} from './postcss-resolver';
import {process, StylableMeta} from './stylable-processor';
import {StylableResults, StylableTransformer} from './stylable-transformer';

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
        protected diagnostics = new Diagnostics()) {
        const {fileProcessor, resolvePath} = createInfrastructure(projectRoot, fileSystem, onProcess);
        this.resolvePath = resolvePath;
        this.fileProcessor = fileProcessor;
        this.resolver = new StylableResolver(this.fileProcessor, this.requireModule);
    }
    public createBundler(): Bundler {
        return new Bundler(this);
    }
    public transform(meta: StylableMeta): StylableResults;
    public transform(source: string, resourcePath: string): StylableResults;
    public transform(meta: string | StylableMeta, resourcePath?: string): StylableResults {
        if (typeof meta === 'string') {
            const root = safeParse(meta, {from: resourcePath});
            meta = process(root, new Diagnostics());
        }

        const transformer = new StylableTransformer({
            delimiter: this.delimiter,
            diagnostics: new Diagnostics(),
            fileProcessor: this.fileProcessor,
            requireModule: this.requireModule
        });

        this.fileProcessor.add(meta.source, meta);

        return transformer.transform(meta);
    }
    public process(fullpath: string): StylableMeta {
        return this.fileProcessor.process(fullpath);
    }
}
