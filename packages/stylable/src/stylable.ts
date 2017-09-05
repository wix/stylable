import { FileProcessor, cachedProcessFile } from "./cached-process-file";
import { StylableMeta, process } from "./stylable-processor";
import { StylableResolver } from "./postcss-resolver";
import { StylableResults, StylableTransformer } from "./stylable-transformer";
import { Diagnostics } from "./diagnostics";
import { safeParse } from "./parser";
import { Bundler } from "./bundle";

const ResolverFactory = require('enhanced-resolve/lib/ResolverFactory');

import * as fs from 'fs';
import * as path from 'path';

export interface fsLike {
    readFileSync: typeof fs.readFileSync;
    readFile: typeof fs.readFile;
    stat: typeof fs.stat;
    statSync: typeof fs.statSync;
    readdir: typeof fs.readdir;
    readdirSync: typeof fs.readdirSync;
    readlink: typeof fs.readlink;
    existsSync: typeof fs.existsSync;
    writeFileSync: typeof fs.writeFileSync;
    mkdirSync: typeof fs.mkdirSync;
}

export class Stylable {
    fileProcessor: FileProcessor<StylableMeta>;
    resolver: StylableResolver;
    resolvePath: (ctx: string, path: string) => string;
    constructor(
        protected projectRoot: string,
        protected fileSystem: fsLike,
        protected requireModule: (path: string) => any,
        public delimiter: string = '--',
        protected onProcess?: (meta: StylableMeta, path: string) => StylableMeta) {
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
        const diagnostics = new Diagnostics();
        if (typeof meta === 'string') {
            const root = safeParse(meta, { from: resourcePath });
            meta = process(root, diagnostics);
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

export interface StylableInfrastructure {
    fileProcessor: FileProcessor<StylableMeta>,
    resolvePath: (context: string, path: string) => string
}

export function createInfrastructure(projectRoot: string, fileSystem: fsLike = fs, onProcess: (meta: StylableMeta, path: string) => StylableMeta = (x) => x): StylableInfrastructure {
    const eResolver = ResolverFactory.createResolver({
        useSyncFileSystemCalls: true,
        fileSystem: fileSystem
    });

    const fileProcessor = cachedProcessFile<StylableMeta>((from, content) => {
        if (!path.isAbsolute(from)) {
            from = eResolver.resolveSync({}, projectRoot, from);
        }
        return onProcess(process(safeParse(content, { from })), from);
    }, {
            readFileSync(moduleId: string) {
                if (!path.isAbsolute(moduleId)) {
                    moduleId = eResolver.resolveSync({}, projectRoot, moduleId);
                }
                return fileSystem.readFileSync(moduleId, 'utf8');
            },
            statSync(moduleId: string) {
                if (!path.isAbsolute(moduleId)) {
                    moduleId = eResolver.resolveSync({}, projectRoot, moduleId);
                }
                const stat = fileSystem.statSync(moduleId);
                if (!stat.mtime) {
                    return {
                        mtime: new Date(0)
                    }
                }

                return stat;
            }
        });

    return {
        resolvePath(context: string, moduleId: string) {
            if (!path.isAbsolute(moduleId) && moduleId.charAt(0) !== '.') {
                moduleId = eResolver.resolveSync({}, context, moduleId);
            }
            return moduleId;
        },
        fileProcessor
    };
}
