import { fixRelativeUrls, tryCollectImportsDeep } from '@stylable/core/dist/index-internal';
import type { BuildContext, BuildOptions, ModuleFormats } from './types';
import { IndexGenerator as BaseIndexGenerator } from './base-generator';
import { generateManifest } from './generate-manifest';
import { handleAssets } from './handle-assets';
import { buildSingleFile, removeBuildProducts } from './build-single-file';
import { DirectoryProcessService } from './directory-process-service/directory-process-service';
import { DiagnosticsManager } from './diagnostics-manager';
import type { CLIDiagnostic } from './report-diagnostics';
import { tryRun } from './build-tools';
import { errorMessages, buildMessages } from './messages';
import postcss from 'postcss';
import { sortModulesByDepth } from '@stylable/build-tools';
import { StylableOptimizer } from '@stylable/optimizer';
import type { Stylable } from '@stylable/core';
import type { IFileSystem } from '@file-services/types';

export async function build(
    {
        srcDir,
        outDir,
        indexFile,
        IndexGenerator = BaseIndexGenerator,
        cjs,
        cjsExt,
        esm,
        esmExt,
        includeCSSInJS,
        outputCSS,
        outputCSSNameTemplate,
        outputSources,
        useNamespaceReference,
        injectCSSRequest,
        optimize,
        minify,
        manifest,
        bundle,
        dts,
        dtsSourceMap,
        diagnostics,
        diagnosticsMode,
        inlineRuntime,
        runtimeCjsRequest = '@stylable/runtime/dist/pure.js',
        runtimeEsmRequest = '@stylable/runtime/esm/pure.js',
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
    const { join, realpathSync, relative, dirname } = fs;
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
    const indexFileGenerator = indexFile
        ? new IndexGenerator({ stylable, log, indexFileTargetPath: join(fullOutDir, indexFile) })
        : null;
    const buildGeneratedFiles = new Set<string>();
    const sourceFiles = new Set<string>();
    const assets = new Set<string>();
    const moduleFormats = getModuleFormats({ cjs, esm, esmExt, cjsExt });

    const { runtimeCjsOutPath, runtimeEsmOutPath } = copyRuntime(
        inlineRuntime,
        projectRoot,
        fullOutDir,
        cjs,
        esm,
        runtimeCjsRequest,
        runtimeEsmRequest,
        fs
    );

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
        async processFiles(_, affectedFiles, deletedFiles, changeOrigin) {
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
                        const { targetFilePath } = removeBuildProducts({
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

                        if (indexFileGenerator) {
                            indexFileGenerator.removeEntryFromIndex(
                                outputSources ? targetFilePath : deletedFile
                            );
                        }
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
                // map st output file path to src file path
                outputFiles.set(
                    join(fullOutDir, relative(fullSrcDir, filePath)),
                    new Set([filePath])
                );

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
            await buildAggregatedEntities(affectedFiles, processGeneratedFiles);
            // rebundle
            if (bundle) {
                tryRun(() => {
                    const outputs = bundleFiles({
                        stylable,
                        sourceFiles,
                        fullSrcDir,
                        fullOutDir,
                        bundle,
                        minify,
                        fs,
                    });
                    for (const { filePath, content, files } of outputs) {
                        processGeneratedFiles.add(filePath);
                        log(mode, buildMessages.EMIT_BUNDLE(filePath, files.length));
                        fs.ensureDirectorySync(dirname(filePath));
                        fs.writeFileSync(filePath, content);
                    }
                }, 'failed to write or minify bundle file');
            }
            if (!diagnostics) {
                diagnosticsManager.delete(identifier);
            }

            const count = deletedFiles.size + affectedFiles.size + assets.size + (bundle ? 1 : 0);

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
                const { targetFilePath } = buildSingleFile({
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
                    resolveRuntimeRequest: (targetFilePath, moduleFormat) => {
                        if (inlineRuntime) {
                            if (moduleFormat === 'cjs' && runtimeCjsOutPath) {
                                return (
                                    './' +
                                    relative(dirname(targetFilePath), runtimeCjsOutPath).replace(
                                        /\\/g,
                                        '/'
                                    )
                                );
                            }
                            if (moduleFormat === 'esm' && runtimeEsmOutPath) {
                                return (
                                    './' +
                                    relative(dirname(targetFilePath), runtimeEsmOutPath).replace(
                                        /\\/g,
                                        '/'
                                    )
                                );
                            }
                        } else {
                            if (moduleFormat === 'cjs') {
                                return runtimeCjsRequest;
                            }
                            if (moduleFormat === 'esm') {
                                return runtimeEsmRequest;
                            }
                        }
                        return '@stylable/runtime';
                    },
                });

                if (indexFileGenerator) {
                    indexFileGenerator.generateFileIndexEntry(
                        outputSources ? targetFilePath : filePath
                    );
                }
            } catch (error) {
                setFileErrorDiagnostic(filePath, error);
            }
        }
    }

    function updateWatcherDependencies(affectedFiles: Set<string>) {
        for (const filePath of affectedFiles) {
            try {
                sourceFiles.add(filePath);
                const meta = tryRun(
                    () => stylable.analyze(filePath),
                    errorMessages.STYLABLE_PROCESS(filePath)
                );
                // todo: consider merging this API with stylable.getDependencies()
                for (const depFilePath of tryCollectImportsDeep(stylable.resolver, meta)) {
                    registerInvalidation(depFilePath, filePath);
                }
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
        const diagnostic: CLIDiagnostic = {
            severity: 'error',
            message: error instanceof Error ? error.message : String(error),
            code: '00000',
            node: postcss.root(),
            filePath,
        };

        diagnosticsManager.set(identifier, filePath, {
            diagnosticsMode,
            diagnostics: [diagnostic],
        });
    }

    async function buildAggregatedEntities(affectedFiles: Set<string>, generated: Set<string>) {
        if (indexFileGenerator) {
            await indexFileGenerator.generateIndexFile(fs);

            generated.add(indexFileGenerator.indexFileTargetPath);
            outputFiles.set(indexFileGenerator.indexFileTargetPath, affectedFiles);
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

function bundleFiles({
    stylable,
    sourceFiles,
    fullSrcDir,
    fullOutDir,
    bundle,
    minify,
    fs,
}: {
    sourceFiles: Set<string>;
    stylable: Stylable;
    fullOutDir: string;
    fullSrcDir: string;
    bundle: string;
    fs: IFileSystem;
    minify: boolean | undefined;
}) {
    const { join, relative } = fs;
    const sortedModules = sortModulesByDepth(
        Array.from(sourceFiles),
        (m) => {
            const meta = stylable.analyze(m);
            if (!meta.transformCssDepth) {
                stylable.transform(meta);
            }
            return meta.transformCssDepth?.cssDepth ?? 0;
        },
        (m) => {
            return m;
        },
        -1 /** PRINT_ORDER */
    );
    const cssBundleCode = sortedModules
        .map((m) => {
            const meta = stylable.analyze(m);
            const targetFilePath = join(fullOutDir, relative(fullSrcDir, meta.source));
            const ast = meta.targetAst!;
            fixRelativeUrls(ast, targetFilePath, join(fullOutDir, bundle));
            return ast.toString();
        })
        .join('\n');

    return [
        {
            filePath: join(fullOutDir, bundle),
            content: minify ? new StylableOptimizer().minifyCSS(cssBundleCode) : cssBundleCode,
            files: sortedModules,
        },
    ];
}

function copyRuntime(
    inlineRuntime: boolean | undefined,
    projectRoot: string,
    fullOutDir: string,
    cjs: boolean | undefined,
    esm: boolean | undefined,
    runtimeCjsRequest: string,
    runtimeEsmRequest: string,
    fs: BuildContext['fs']
) {
    let runtimeCjsOutPath;
    let runtimeEsmOutPath;

    if (inlineRuntime) {
        const runtimeCjsPath = resolveRequestInContext(fs, runtimeCjsRequest, projectRoot);
        const runtimeEsmPath = resolveRequestInContext(fs, runtimeEsmRequest, projectRoot);
        if (cjs) {
            fs.ensureDirectorySync(fullOutDir);
            runtimeCjsOutPath = fs.join(fullOutDir, 'stylable-cjs-runtime.js');
            fs.writeFileSync(runtimeCjsOutPath, fs.readFileSync(runtimeCjsPath, 'utf8'));
        }
        if (esm) {
            fs.ensureDirectorySync(fullOutDir);
            runtimeEsmOutPath = fs.join(fullOutDir, 'stylable-esm-runtime.js');
            fs.writeFileSync(runtimeEsmOutPath, fs.readFileSync(runtimeEsmPath, 'utf8'));
        }
    }

    return { runtimeCjsOutPath, runtimeEsmOutPath };
}

function resolveRequestInContext(fs: IFileSystem, request: string, projectRoot: string) {
    return fs.isAbsolute(request)
        ? request
        : require.resolve(request, {
              paths: [projectRoot],
          });
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

function getModuleFormats({
    esm,
    cjs,
    cjsExt,
    esmExt,
}: {
    esm: boolean | undefined;
    cjs: boolean | undefined;
    cjsExt: '.cjs' | '.js' | undefined;
    esmExt: '.mjs' | '.js' | undefined;
}): ModuleFormats {
    const formats: ModuleFormats = [];
    if (esm) {
        formats.push(['esm', esmExt || '.mjs']);
    }
    if (cjs) {
        formats.push(['cjs', cjsExt || '.js']);
    }
    return formats;
}
