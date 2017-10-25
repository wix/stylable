import { FileProcessor, MinimalFS } from "./cached-process-file";
import { StylableMeta, process } from "./stylable-processor";
import { StylableResolver } from "./postcss-resolver";
import { StylableResults, StylableTransformer } from "./stylable-transformer";
import { Diagnostics } from "./diagnostics";
import { safeParse } from "./parser";
import { Bundler } from "./bundle";
import { createInfrastructure } from "./create-infra-structure";


export class Stylable {
    fileProcessor: FileProcessor<StylableMeta>;
    resolver: StylableResolver;
    resolvePath: (ctx: string, path: string) => string;
    constructor(
        protected projectRoot: string,
        protected fileSystem: MinimalFS,
        protected requireModule: (path: string) => any,
        public delimiter: string = '--',
        protected onProcess?: (meta: StylableMeta, path: string) => StylableMeta,
        protected diagnostics = new Diagnostics()) {
        const { fileProcessor, resolvePath } = createInfrastructure(projectRoot, fileSystem, onProcess);
        this.resolvePath = resolvePath;
        this.fileProcessor = fileProcessor;
        this.resolver = new StylableResolver(this.fileProcessor, this.requireModule);
    }
    createBundler(): Bundler {
        return new Bundler(this);
    }
    transform(meta: StylableMeta): StylableResults
    transform(source: string, resourcePath: string): StylableResults
    transform(meta: string | StylableMeta, resourcePath?: string): StylableResults {
        if (typeof meta === 'string') {
            const root = safeParse(meta, { from: resourcePath });
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
    process(fullpath: string): StylableMeta {
        return this.fileProcessor.process(fullpath);
    }
}
