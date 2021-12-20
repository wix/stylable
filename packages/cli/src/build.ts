import type { BuildMetaData, BuildOptions } from './types';
import { Stylable, visitMetaCSSDependenciesBFS } from '@stylable/core';
import { Generator as BaseGenerator } from './base-generator';
import { generateManifest } from './generate-manifest';
import { handleAssets } from './handle-assets';
import { buildSingleFile, removeBuildProducts } from './build-single-file';
import { DirectoryProcessService } from './directory-process-service/directory-process-service';
import { levels } from './logger';
import { DiagnosticsManager } from './diagnostics-manager';
import { tryRun } from './build-tools';
import { messages } from './messages';

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
    {
        projectRoot: _projectRoot,
        rootDir: _rootDir,
        identifier = _projectRoot,
        watch,
        fs,
        stylable,
        log,
        outputFiles = new Map(),
        diagnosticsManager = new DiagnosticsManager(),
    }: BuildMetaData
) {
    const { resolve, join, realpathSync } = fs;
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
    const generator = new Generator(stylable, log);
    const generated = new Set<string>();
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
            if (!filePath.startsWith(fullSrcDir)) {
                return false;
            }
            // stylable files
            return filePath.endsWith(extension);
        },
        onError(error) {
            if (watch) {
                console.error(error);
            } else {
                throw error;
            }
        },
        processFiles(service, affectedFiles, deletedFiles, changeOrigin) {
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

            const diagnosedFiles = Array.from(diagnosticsManager.get(identifier)?.keys() || []);

            if (diagnosedFiles.length) {
                // add files that contains errors for retry
                for (const filePath of diagnosedFiles) {
                    affectedFiles.add(filePath);
                }

                diagnosticsManager.delete(identifier);
            }

            for (const filePath of affectedFiles) {
                // map st output file path to src file path
                outputFiles.set(resolve(filePath.replace(fullSrcDir, fullOutDir)), filePath);

                // remove assets from the affected files (handled in buildAggregatedEntities)
                if (assets.has(filePath)) {
                    affectedFiles.delete(filePath);
                }
            }

            // rebuild
            buildFiles(affectedFiles);
            // rewire invalidations
            updateWatcherDependencies(stylable, service, affectedFiles, sourceFiles, outputFiles);
            // rebuild assets from aggregated content: index files and assets
            buildAggregatedEntities();

            if (!diagnostics) {
                diagnosticsManager.delete(identifier);
            }

            const count = deletedFiles.size + affectedFiles.size + assets.size;

            if (count) {
                log(
                    mode,
                    `[${new Date().toLocaleTimeString()}]`,
                    messages.FINISHED_PROCESSING(
                        count,
                        isMultiPackagesProject ? identifier : undefined
                    )
                );
            }
        },
    });

    await service.init(fullSrcDir);

    if (sourceFiles.size === 0) {
        log(
            mode,
            `[${new Date().toLocaleTimeString()}]`,
            messages.BUILD_SKIPPED(isMultiPackagesProject ? identifier : undefined)
        );
    }

    return { service };

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
                    diagnosticsManager,
                    diagnosticsMode,
                    identifier,
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
            const generatedAssets = handleAssets(assets, projectRoot, srcDir, outDir, fs);
            const { manifestOutputPath } = generateManifest(
                projectRoot,
                sourceFiles,
                manifest,
                stylable,
                mode,
                log,
                fs
            );

            generated.add(manifestOutputPath);

            for (const generatedAsset of generatedAssets) {
                generated.add(generatedAsset);
            }
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

function updateWatcherDependencies(
    stylable: Stylable,
    service: DirectoryProcessService,
    affectedFiles: Set<string>,
    sourceFiles: Set<string>,
    outputFiles: Map<string, string>
) {
    const resolver = stylable.createResolver();
    for (const filePath of affectedFiles) {
        sourceFiles.add(filePath);
        const meta = stylable.process(filePath);
        visitMetaCSSDependenciesBFS(
            meta,
            ({ source }) => {
                service.registerInvalidateOnChange(outputFiles.get(source) ?? source, filePath);
            },
            resolver,
            (resolvedPath) => {
                service.registerInvalidateOnChange(
                    outputFiles.get(resolvedPath) ?? resolvedPath,
                    filePath
                );
            }
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
