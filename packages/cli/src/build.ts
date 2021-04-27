import { Stylable, visitMetaCSSDependenciesBFS } from '@stylable/core';
import { findFiles } from '@stylable/node';
import type { IFileSystem } from '@file-services/types';
import type { Generator } from './base-generator';
import { generateManifest } from './generate-manifest';
import { handleAssets } from './handle-assets';
import { buildSingleFile } from './build-single-file';
import { DirectoryProcessService } from './watch-service/watch-service';

export interface BuildOptions {
    extension: string;
    fs: IFileSystem;
    stylable: Stylable;
    rootDir: string;
    srcDir: string;
    outDir: string;
    manifest?: string;
    log: (...args: string[]) => void;
    indexFile?: string;
    generatorPath?: string;
    moduleFormats?: Array<'cjs' | 'esm'>;
    outputCSSNameTemplate?: string;
    includeCSSInJS?: boolean;
    outputCSS?: boolean;
    outputSources?: boolean;
    useSourceNamespace?: boolean;
    injectCSSRequest?: boolean;
    optimize?: boolean;
    minify?: boolean;
    watch?: boolean;
}

export function build({
    extension,
    fs,
    stylable,
    rootDir,
    srcDir,
    outDir,
    log,
    indexFile,
    generatorPath,
    moduleFormats,
    includeCSSInJS,
    outputCSS,
    outputCSSNameTemplate,
    outputSources,
    useSourceNamespace,
    injectCSSRequest,
    optimize,
    minify,
    manifest,
    watch,
}: BuildOptions) {
    const { join, relative } = fs;
    const fullSrcDir = join(rootDir, srcDir);
    const fullOutDir = join(rootDir, outDir);

    validateConfiguration(outputSources, outDir, srcDir);

    const generator = getGenerator(stylable, log, generatorPath);
    const generated = new Set<string>();
    const sourceFiles = new Set<string>();
    const assets = new Set<string>();
    const diagnosticsMessages: string[] = [];

    if (watch) {
        new DirectoryProcessService(fs, {
            autoResetInvalidations: true,
            directoryFilter(dirPath) {
                if (
                    dirPath.startsWith(outDir) ||
                    dirPath.includes('node_modules') ||
                    dirPath.includes('.git')
                ) {
                    return false;
                }
                return true;
            },
            fileFilter(filePath) {
                if (generated.has(filePath)) {
                    return false;
                }
                return filePath.endsWith('.st.css');
            },
            onError(error) {
                console.error(error);
            },
            processFiles(service, affectedFiles, changeOrigin) {
                if (changeOrigin) {
                    stylable.initCache();
                }
                buildFiles(affectedFiles);
                updateWatcherDependencies();
                buildAggregatedEntities();

                function updateWatcherDependencies() {
                    const resolver = stylable.createResolver({});
                    for (const filePath of affectedFiles) {
                        sourceFiles.add(filePath);
                        const meta = stylable.process(filePath);
                        visitMetaCSSDependenciesBFS(
                            meta,
                            ({ source }) => {
                                service.registerInvalidateOnChange(source, filePath);
                            },
                            resolver
                        );
                    }
                }
            },
        })
            .watch(rootDir)
            .then(() => {
                console.log('watch started');
            })
            .catch((e) => {
                console.error(e);
            });
    } else {
        // TODO: maybe can be removed and use the watcher files instead
        const { result } = findFiles(
            fs,
            join,
            relative,
            fullSrcDir,
            extension,
            new Set<string>(['node_modules', '.git'])
        );
        for (const filePath of result) {
            sourceFiles.add(filePath);
        }

        if (sourceFiles.size === 0) {
            log('[Build]', 'No stylable files found. build skipped.');
        } else {
            log('[Build]', `Building ${sourceFiles.size} stylable files.`);
        }

        buildFiles(sourceFiles);
        buildAggregatedEntities();
    }

    return { diagnosticsMessages };

    function buildFiles(filesToBuild: Set<string>) {
        for (const filePath of filesToBuild) {
            if (indexFile) {
                generator.generateFileIndexEntry(filePath, fullOutDir);
            } else {
                buildSingleFile({
                    fullOutDir,
                    filePath,
                    fullSrcDir,
                    log,
                    fs,
                    stylable,
                    diagnosticsMsg: diagnosticsMessages,
                    projectAssets: assets,
                    moduleFormats: moduleFormats || [],
                    includeCSSInJS,
                    outputCSS,
                    outputCSSNameTemplate,
                    outputSources,
                    useSourceNamespace,
                    injectCSSRequest,
                    optimize,
                    minify,
                    generated,
                });
            }
        }
    }

    function buildAggregatedEntities() {
        if (indexFile) {
            generator.generateIndexFile(fs, fullOutDir, indexFile);
        } else {
            handleAssets(assets, rootDir, srcDir, outDir, fs);
            generateManifest(rootDir, sourceFiles, manifest, stylable, log, fs);
        }
    }
}

function getGenerator(
    stylable: Stylable,
    log: (...args: string[]) => void,
    generatorPath?: string
) {
    const generatorModule: { Generator: typeof Generator } = generatorPath
        ? require(generatorPath)
        : require('./base-generator');
    return new generatorModule.Generator(stylable, log);
}

function validateConfiguration(outputSources: boolean | undefined, outDir: string, srcDir: string) {
    if (outputSources && srcDir === outDir) {
        throw new Error(
            'Invalid configuration: When using "stcss" outDir and srcDir must be different.' +
                `\noutDir: ${outDir}` +
                `\nsrcDir: ${srcDir}`
        );
    }
}
