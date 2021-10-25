import type { BuildMetaData, BuildOptions } from './types';
import { Stylable, visitMetaCSSDependenciesBFS } from '@stylable/core';
import { Generator as BaseGenerator } from './base-generator';
import { generateManifest } from './generate-manifest';
import { handleAssets } from './handle-assets';
import { buildSingleFile, removeBuildProducts } from './build-single-file';
import { DirectoryProcessService } from './directory-process-service/directory-process-service';
import { levels } from './logger';
import { DiagnosticMessages, reportDiagnostics } from './report-diagnostics';
import { tryRun } from './build-tools';

export const messages = {
    START_WATCHING: 'start watching...',
    FINISHED_PROCESSING: 'finished processing',
    BUILD_SKIPPED: 'No stylable files found. build skipped',
};

export async function build(
    {
        extension,
        srcDir,
        outDir,
        indexFile,
        Generator = BaseGenerator,
        cjs,
        esm,
        includeCSSInJS,
        outputCSS,
        outputCSSNameTemplate,
        outputSources,
        useNamespaceReference,
        injectCSSRequest,
        optimize,
        minify,
        manifest,
        dts,
        dtsSourceMap,
        diagnostics,
        diagnosticsMode,
    }: BuildOptions,
    { watch, fs, stylable, rootDir, projectRoot, log }: BuildMetaData
) {
    const { join } = fs;
    const fullSrcDir = join(projectRoot, srcDir);
    const fullOutDir = join(projectRoot, outDir);
    const nodeModules = join(projectRoot, 'node_modules');
    const isMultiPackagesProject = projectRoot !== rootDir;

    validateConfiguration(outputSources, fullOutDir, fullSrcDir);
    const mode = watch ? '[Watch]' : '[Build]';
    const generator = new Generator(stylable, log);
    const generated = new Set<string>();
    const sourceFiles = new Set<string>();
    const assets = new Set<string>();
    const diagnosticsMessages: DiagnosticMessages = new Map();
    const moduleFormats = getModuleFormats({ cjs, esm });

    const service = new DirectoryProcessService(fs, {
        watchMode: watch,
        autoResetInvalidations: true,
        directoryFilter(dirPath) {
            if (!dirPath.startsWith(projectRoot)) {
                return false;
            }
            if (dirPath.startsWith(nodeModules) || dirPath.includes('.git')) {
                return false;
            }
            return true;
        },
        fileFilter(filePath) {
            if (generated.has(filePath)) {
                return false;
            }
            if (!indexFile && outputSources && filePath.startsWith(fullOutDir)) {
                return false;
            }
            // assets used in stylable files should re-trigger "processFiles" when changed
            if (assets.has(filePath)) {
                return true;
            }
            // stylable files
            return filePath.endsWith(extension);
        },
        onError(error) {
            console.error(error);
        },
        processFiles(service, affectedFiles, deletedFiles, changeOrigin) {
            if (changeOrigin) {
                // watched file changed, invalidate cache
                stylable.initCache();
                // handle deleted files by removing their generated content
                if (deletedFiles.size) {
                    for (const deletedFile of deletedFiles) {
                        if (assets.has(deletedFile)) {
                            assets.delete(deletedFile);
                            continue;
                        } else if (!sourceFiles.has(deletedFile)) {
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
                            dts,
                            dtsSourceMap,
                        });
                    }
                }
            }

            // add files that contains errors for retry
            for (const filePath of diagnosticsMessages.keys()) {
                affectedFiles.add(filePath);
            }
            diagnosticsMessages.clear();

            // remove assets from the affected files (handled in buildAggregatedEntities)
            for (const filePath of affectedFiles) {
                if (assets.has(filePath)) {
                    affectedFiles.delete(filePath);
                }
            }

            // rebuild
            buildFiles(affectedFiles);
            // rewire invalidations
            updateWatcherDependencies(stylable, service, affectedFiles, sourceFiles);
            // rebuild assets from aggregated content: index files and assets
            buildAggregatedEntities();
            // report build diagnostics
            reportDiagnostics(diagnosticsMessages, diagnostics, diagnosticsMode);

            const count = deletedFiles.size + affectedFiles.size + assets.size;

            if (!changeOrigin || (changeOrigin && count)) {
                log(
                    mode,
                    `[${new Date().toLocaleTimeString()}]`,
                    messages.FINISHED_PROCESSING,
                    count,
                    count === 1 ? 'file' : 'files',
                    isMultiPackagesProject ? `in "${projectRoot}"` : '',
                    levels.info
                );
            }
        },
    });

    await service.init(fullSrcDir);

    if (sourceFiles.size === 0) {
        log(
            mode,
            messages.BUILD_SKIPPED,
            isMultiPackagesProject ? `for "${projectRoot}"` : '',
            levels.info
        );
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
                    useNamespaceReference,
                    injectCSSRequest,
                    optimize,
                    dts,
                    dtsSourceMap,
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
            handleAssets(assets, projectRoot, srcDir, outDir, fs);
            generateManifest(projectRoot, sourceFiles, manifest, stylable, mode, log, fs);
        }
    }
}

export function createGenerator(
    root: string,
    generatorPath?: string
): undefined | typeof BaseGenerator {
    if (!generatorPath) {
        return undefined;
    }

    const absoluteGeneratorPath = require.resolve(generatorPath, { paths: [root] });

    return tryRun(() => {
        const generatorModule: { Generator: typeof BaseGenerator } = require(absoluteGeneratorPath);

        return generatorModule.Generator;
    }, `Could not resolve custom generator from "${absoluteGeneratorPath}"`);
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

function getModuleFormats({ esm, cjs }: { [k: string]: boolean | undefined }) {
    const formats: Array<'esm' | 'cjs'> = [];
    if (esm) {
        formats.push('esm');
    }
    if (cjs) {
        formats.push('cjs');
    }
    return formats;
}
