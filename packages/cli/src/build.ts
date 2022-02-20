import type { BuildContext, BuildOptions } from './types';
import { visitMetaCSSDependenciesBFS } from '@stylable/core';
import { IndexGenerator as BaseIndexGenerator } from './base-generator';
import { generateManifest } from './generate-manifest';
import { handleAssets } from './handle-assets';
import { buildSingleFile, removeBuildProducts } from './build-single-file';
import { DirectoryProcessService } from './directory-process-service/directory-process-service';
import { DiagnosticsManager } from './diagnostics-manager';
import type { Diagnostic } from './report-diagnostics';
import { tryRun } from './build-tools';
import { errorMessages, buildMessages } from './messages';

export async function build(
    {
        srcDir,
        outDir,
        indexFile,
        IndexGenerator = BaseIndexGenerator,
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
    {
        projectRoot: _projectRoot,
        rootDir: _rootDir,
        identifier = _projectRoot,
        watch,
        fs,
        stylable,
        log,
        outputFiles = new Map(),
        diagnosticsManager = new DiagnosticsManager({ log }),
    }: BuildContext
) {
    const { join, realpathSync, relative } = fs;
    const projectRoot = realpathSync(_projectRoot);
    const rootDir = realpathSync(_rootDir);
    const fullSrcDir = join(projectRoot, srcDir);
    const fullOutDir = join(projectRoot, outDir);
    const nodeModules = join(projectRoot, 'node_modules');
    const isMultiPackagesProject = projectRoot !== rootDir;

    if (projectRoot !== _projectRoot) {
        log(`projectRoot is linked:\n${_projectRoot}\n↳${projectRoot}`);
    }

    const mode = watch ? '[Watch]' : '[Build]';
    const generator = new IndexGenerator(stylable, log);
    const buildGeneratedFiles = new Set<string>();
    const sourceFiles = new Set<string>();
    const assets = new Set<string>();
    const moduleFormats = getModuleFormats({ cjs, esm });

    const service = new DirectoryProcessService(fs, {
        watchMode: watch,
        autoResetInvalidations: true,
        watchOptions: {
            skipInitialWatch: true,
        },
        directoryFilter(dirPath) {
            if (!dirPath.startsWith(fullSrcDir)) {
                return false;
            }
            if (fullSrcDir !== fullOutDir && !indexFile && dirPath.startsWith(fullOutDir)) {
                return false;
            }
            if (dirPath.startsWith(nodeModules) || dirPath.includes('.git')) {
                return false;
            }
            return true;
        },
        fileFilter(filePath) {
            if (buildGeneratedFiles.has(filePath)) {
                return false;
            }
            if (!indexFile && outputSources && filePath.startsWith(fullOutDir)) {
                return false;
            }
            // assets used in stylable files should re-trigger "processFiles" when changed
            if (assets.has(filePath)) {
                return true;
            }
            if (!filePath.startsWith(fullSrcDir)) {
                return false;
            }
            // stylable files
            return filePath.endsWith('.st.css');
        },
        onError(error) {
            if (watch) {
                console.error(error);
            } else {
                throw error;
            }
        },
        processFiles(_, affectedFiles, deletedFiles, changeOrigin) {
            if (changeOrigin) {
                // handle deleted files by removing their generated content
                if (deletedFiles.size) {
                    for (const deletedFile of deletedFiles) {
                        if (assets.has(deletedFile)) {
                            assets.delete(deletedFile);
                            continue;
                        } else if (!sourceFiles.has(deletedFile)) {
                            continue;
                        }
                        diagnosticsManager.delete(identifier, deletedFile);
                        sourceFiles.delete(deletedFile);
                        generator.removeEntryFromIndex(deletedFile, fullOutDir);
                        removeBuildProducts({
                            fullOutDir,
                            fullSrcDir,
                            filePath: deletedFile,
                            log,
                            fs,
                            moduleFormats,
                            outputCSS,
                            outputCSSNameTemplate,
                            outputSources,
                            generated: buildGeneratedFiles,
                            dts,
                            dtsSourceMap,
                        });
                    }
                }
            }

            const processGeneratedFiles = new Set<string>();
            const diagnosedFiles = Array.from(diagnosticsManager.get(identifier)?.keys() || []);

            if (diagnosedFiles.length) {
                // add files that contains errors for retry
                for (const filePath of diagnosedFiles) {
                    affectedFiles.add(filePath);
                }

                diagnosticsManager.delete(identifier);
            }

            for (const filePath of affectedFiles) {
                if (!indexFile) {
                    // map st output file path to src file path
                    outputFiles.set(
                        join(fullOutDir, relative(fullSrcDir, filePath)),
                        new Set([filePath])
                    );
                }

                // remove assets from the affected files (handled in buildAggregatedEntities)
                if (assets.has(filePath)) {
                    affectedFiles.delete(filePath);
                }
            }

            // rebuild
            buildFiles(affectedFiles, processGeneratedFiles);
            // rewire invalidations
            updateWatcherDependencies(affectedFiles);
            // rebuild assets from aggregated content: index files and assets
            buildAggregatedEntities(affectedFiles, processGeneratedFiles);

            if (!diagnostics) {
                diagnosticsManager.delete(identifier);
            }

            const count = deletedFiles.size + affectedFiles.size + assets.size;

            if (count) {
                log(
                    mode,
                    buildMessages.FINISHED_PROCESSING(
                        count,
                        isMultiPackagesProject ? identifier : undefined
                    )
                );
            }

            // merge the current process generated files with the total build generated files
            for (const generatedFile of processGeneratedFiles) {
                buildGeneratedFiles.add(generatedFile);
            }

            return { generatedFiles: processGeneratedFiles };
        },
    });

    await service.init(fullSrcDir);

    if (sourceFiles.size === 0) {
        log(mode, buildMessages.BUILD_SKIPPED(isMultiPackagesProject ? identifier : undefined));
    }

    return { service, generatedFiles: buildGeneratedFiles };

    function buildFiles(filesToBuild: Set<string>, generated: Set<string>) {
        for (const filePath of filesToBuild) {
            try {
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
                        diagnosticsManager,
                        diagnosticsMode,
                        identifier,
                        projectAssets: assets,
                        moduleFormats,
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
            } catch (error) {
                setFileErrorDiagnostic(filePath, error);
            }
        }
    }

    function updateWatcherDependencies(affectedFiles: Set<string>) {
        const resolver = stylable.createResolver();
        for (const filePath of affectedFiles) {
            try {
                sourceFiles.add(filePath);
                const meta = tryRun(
                    () => stylable.process(filePath),
                    errorMessages.STYLABLE_PROCESS(filePath)
                );
                visitMetaCSSDependenciesBFS(
                    meta,
                    ({ source }) => registerInvalidation(source, filePath),
                    resolver,
                    (resolvedPath) => registerInvalidation(resolvedPath, filePath)
                );
            } catch (error) {
                setFileErrorDiagnostic(filePath, error);
            }
        }

        function registerInvalidation(source: string, filePath: string) {
            if (outputFiles.has(source)) {
                for (const sourceFile of outputFiles.get(source)!) {
                    service.registerInvalidateOnChange(sourceFile, filePath);
                }
            } else {
                service.registerInvalidateOnChange(source, filePath);
            }
        }
    }

    function setFileErrorDiagnostic(filePath: string, error: any) {
        const diangostic: Diagnostic = {
            type: 'error',
            message: error instanceof Error ? error.message : String(error),
        };

        diagnosticsManager.set(identifier, filePath, {
            diagnosticsMode,
            diagnostics: [diangostic],
        });
    }

    function buildAggregatedEntities(affectedFiles: Set<string>, generated: Set<string>) {
        if (indexFile) {
            const indexFilePath = join(fullOutDir, indexFile);
            generated.add(indexFilePath);
            generator.generateIndexFile(fs, indexFilePath);

            outputFiles.set(indexFilePath, affectedFiles);
        } else {
            const generatedAssets = handleAssets(assets, projectRoot, srcDir, outDir, fs);
            for (const generatedAsset of generatedAssets) {
                generated.add(generatedAsset);
            }

            if (manifest) {
                generateManifest(projectRoot, sourceFiles, manifest, stylable, mode, log, fs);
                generated.add(manifest);
            }
        }
    }
}

export function createGenerator(
    root: string,
    generatorPath?: string
): undefined | typeof BaseIndexGenerator {
    if (!generatorPath) {
        return undefined;
    }

    const absoluteGeneratorPath = require.resolve(generatorPath, { paths: [root] });

    return tryRun(() => {
        const generatorModule: {
            Generator: typeof BaseIndexGenerator;
        } = require(absoluteGeneratorPath);

        return generatorModule.Generator;
    }, `Could not resolve custom generator from "${absoluteGeneratorPath}"`);
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
