import { Stylable, visitMetaCSSDependenciesBFS } from '@stylable/core';
import type { IFileSystem } from '@file-services/types';
import type { Generator } from './base-generator';
import { generateManifest } from './generate-manifest';
import { handleAssets } from './handle-assets';
import { buildSingleFile, removeBuildProducts } from './build-single-file';
import { DirectoryProcessService } from './directory-process-service/directory-process-service';
import { levels, Log } from './logger';
import { reportDiagnostics } from './report-diagnostics';

export const messages = {
    START_WATCHING: 'start watching...',
    FINISHED_PROCESSING: 'finished processing',
    BUILD_SKIPPED: 'No stylable files found. build skipped.',
};

export interface BuildOptions {
    extension: string;
    fs: IFileSystem;
    stylable: Stylable;
    rootDir: string;
    srcDir: string;
    outDir: string;
    manifest?: string;
    log: Log;
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
    diagnostics?: boolean;
}

export async function build({
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
    diagnostics,
}: BuildOptions) {
    const { join } = fs;
    const fullSrcDir = join(rootDir, srcDir);
    const fullOutDir = join(rootDir, outDir);

    validateConfiguration(outputSources, fullOutDir, fullSrcDir);
    const mode = watch ? '[Watch]' : '[Build]';
    const generator = createGenerator(stylable, log, generatorPath);
    const generated = new Set<string>();
    const sourceFiles = new Set<string>();
    const assets = new Set<string>();
    const diagnosticsMessages = new Map<string, string[]>();

    const service = new DirectoryProcessService(fs, {
        watchMode: watch,
        autoResetInvalidations: true,
        directoryFilter(dirPath) {
            if (
                // TODO: (watch && dirPath.startsWith(fullOutDir)) ||
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
            return filePath.endsWith(extension);
        },
        onError(error) {
            console.error(error);
        },
        processFiles(service, affectedFiles, deletedFiles, changeOrigin) {
            if (changeOrigin) {
                stylable.initCache();
                if (deletedFiles.size) {
                    for (const deletedFile of deletedFiles) {
                        if (!sourceFiles.has(deletedFile)) {
                            continue;
                        }
                        diagnosticsMessages.delete(deletedFile);
                        sourceFiles.delete(deletedFile);
                        generator.removeEntryFromIndex(deletedFile, fullOutDir);
                        removeBuildProducts({
                            fullOutDir,
                            fullSrcDir,
                            filePath: deletedFile,
                            log,
                            fs,
                            moduleFormats: moduleFormats || [],
                            outputCSS,
                            outputCSSNameTemplate,
                            outputSources,
                            generated,
                        });
                    }
                }
            }

            for (const filePath of diagnosticsMessages.keys()) {
                affectedFiles.add(filePath);
            }
            diagnosticsMessages.clear();

            buildFiles(affectedFiles);
            updateWatcherDependencies(stylable, service, affectedFiles, sourceFiles);
            buildAggregatedEntities();

            if (diagnostics && diagnosticsMessages.size) {
                reportDiagnostics(diagnosticsMessages);
            }

            const count = deletedFiles.size + affectedFiles.size;
            log(
                mode,
                `${messages.FINISHED_PROCESSING} ${count} ${count === 1 ? 'file' : 'files'}${
                    changeOrigin ? ', watching...' : ''
                }`,
                levels.info
            );
        },
    });

    await service.init(fullSrcDir);

    if (watch) {
        log(mode, messages.START_WATCHING, levels.info);
    } else if (sourceFiles.size === 0) {
        log(mode, messages.BUILD_SKIPPED, levels.info);
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
                    diagnosticsMessages,
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
            const indexFilePath = join(fullOutDir, indexFile);
            generated.add(indexFilePath);
            generator.generateIndexFile(fs, indexFilePath);
        } else {
            handleAssets(assets, rootDir, srcDir, outDir, fs);
            generateManifest(rootDir, sourceFiles, manifest, stylable, mode, log, fs);
        }
    }
}

function createGenerator(stylable: Stylable, log: Log, generatorPath?: string) {
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

function updateWatcherDependencies(
    stylable: Stylable,
    service: DirectoryProcessService,
    affectedFiles: Set<string>,
    sourceFiles: Set<string>
) {
    const resolver = stylable.createResolver();
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
