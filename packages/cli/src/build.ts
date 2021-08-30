import { Stylable, visitMetaCSSDependenciesBFS } from '@stylable/core';
import type { IFileSystem } from '@file-services/types';
import type { Generator } from './base-generator';
import { generateManifest } from './generate-manifest';
import { handleAssets } from './handle-assets';
import { buildSingleFile, removeBuildProducts } from './build-single-file';
import { DirectoryProcessService } from './directory-process-service/directory-process-service';
import { levels, Log } from './logger';
import { DiagnosticMessages, reportDiagnostics } from './report-diagnostics';

export const messages = {
    START_WATCHING: 'start watching...',
    FINISHED_PROCESSING: 'finished processing',
    BUILD_SKIPPED: 'No stylable files found. build skipped.',
};

export interface BuildOptions {
    /** Specify the extension of stylable files */
    extension: string;
    /** provide a custom file-system for the build */
    fs: IFileSystem;
    /** provide Stylable instance */
    stylable: Stylable;
    /** project root directory */
    rootDir: string;
    /** specify where to find source files */
    srcDir: string;
    /** specify where to build the target files */
    outDir: string;
    /** should the build need to output manifest file */
    manifest?: string;
    /** log function */
    log: Log;
    /** opt into build index file and specify the filepath for the generated index file */
    indexFile?: string;
    /** path to a custom cli index generator */
    generatorPath?: string;
    /** specify emitted module formats */
    moduleFormats?: Array<'cjs' | 'esm'>;
    /** template of the css file emitted when using outputCSS */
    outputCSSNameTemplate?: string;
    /** should include the css in the generated JS module */
    includeCSSInJS?: boolean;
    /** should output build css for each source file */
    outputCSS?: boolean;
    /** should output source .st.css file to dist */
    outputSources?: boolean;
    /** should add namespace reference to the .st.css copy  */
    useNamespaceReference?: boolean;
    /** should inject css import in the JS module for the generated css from outputCSS */
    injectCSSRequest?: boolean;
    /** should apply css optimizations */
    optimize?: boolean;
    /** should minify css */
    minify?: boolean;
    /** should generate .d.ts definitions for every stylesheet */
    dts?: boolean;
    /** should generate .d.ts.map files for every .d.ts mapping back to the source .st.css */
    dtsSourceMap?: boolean;
    /** enable watch mode */
    watch?: boolean;
    /** should emit diagnostics */
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
    useNamespaceReference,
    injectCSSRequest,
    optimize,
    minify,
    manifest,
    dts,
    dtsSourceMap,
    watch,
    diagnostics,
}: BuildOptions) {
    const { join, resolve } = fs;
    rootDir = resolve(rootDir);
    const fullSrcDir = join(rootDir, srcDir);
    const fullOutDir = join(rootDir, outDir);
    const nodeModules = join(rootDir, 'node_modules');

    validateConfiguration(outputSources, fullOutDir, fullSrcDir);
    const mode = watch ? '[Watch]' : '[Build]';
    const generator = createGenerator(stylable, log, generatorPath);
    const generated = new Set<string>();
    const sourceFiles = new Set<string>();
    const assets = new Set<string>();
    const diagnosticsMessages: DiagnosticMessages = new Map();

    const service = new DirectoryProcessService(fs, {
        watchMode: watch,
        autoResetInvalidations: true,
        directoryFilter(dirPath) {
            if (!dirPath.startsWith(rootDir)) {
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
