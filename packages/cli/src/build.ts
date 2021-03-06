import { isAsset, Stylable } from '@stylable/core';
import { createModuleSource } from '@stylable/module-utils';
import { FileSystem, findFiles } from '@stylable/node';
import { StylableOptimizer } from '@stylable/optimizer';
import { basename, dirname, join, relative, resolve } from 'path';
import { ensureDirectory, handleDiagnostics, tryRun } from './build-tools';
import type { Generator } from './base-generator';
import { generateManifest } from './generate-manifest';
import { handleAssets } from './handle-assets';
import { nameTemplate } from './name-template';

export interface BuildOptions {
    extension: string;
    fs: FileSystem;
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
}: BuildOptions) {
    const generatorModule: { Generator: typeof Generator } = generatorPath
        ? require(resolve(generatorPath))
        : require('./base-generator');
    const generator = new generatorModule.Generator(stylable, log);
    const blacklist = new Set<string>(['node_modules']);
    const fullSrcDir = join(rootDir, srcDir);
    const fullOutDir = join(rootDir, outDir);
    const { result: filesToBuild } = findFiles(fs, fullSrcDir, extension, blacklist);
    const assets: string[] = [];
    const diagnosticsMessages: string[] = [];

    if (filesToBuild.length === 0) {
        log('[Build]', 'No stylable files found. build skipped.');
    } else {
        log('[Build]', `Building ${filesToBuild.length} stylable files.`);
    }
    filesToBuild.forEach((filePath) => {
        indexFile
            ? generator.generateFileIndexEntry(filePath, fullOutDir)
            : buildSingleFile(
                  fullOutDir,
                  filePath,
                  fullSrcDir,
                  log,
                  fs,
                  stylable,
                  diagnosticsMessages,
                  assets,
                  moduleFormats || [],
                  includeCSSInJS,
                  outputCSS,
                  outputCSSNameTemplate,
                  outputSources,
                  useSourceNamespace,
                  injectCSSRequest,
                  optimize,
                  minify
              );
    });

    if (indexFile) {
        generator.generateIndexFile(fs, fullOutDir, indexFile);
    }

    if (!indexFile) {
        handleAssets(assets, rootDir, srcDir, outDir, fs);
        generateManifest(rootDir, filesToBuild, manifest, stylable, log, fs);
    }
    return { diagnosticsMessages };
}

function buildSingleFile(
    fullOutDir: string,
    filePath: string,
    fullSrcDir: string,
    log: (...args: string[]) => void,
    fs: any,
    stylable: Stylable,
    diagnosticsMsg: string[],
    projectAssets: string[],
    moduleFormats: string[],
    includeCSSInJS = false,
    outputCSS = false,
    outputCSSNameTemplate = '[filename].css',
    outputSources = false,
    useSourceNamespace = false,
    injectCSSRequest = false,
    optimize = false,
    minify = false
) {
    const outSrcPath = join(fullOutDir, filePath.replace(fullSrcDir, ''));
    const outPath = outSrcPath + '.js';
    const fileDirectory = dirname(filePath);
    const outDirPath = dirname(outPath);
    const cssAssetFilename = nameTemplate(outputCSSNameTemplate, {
        filename: basename(outSrcPath, '.st.css'),
    });
    const cssAssetOutPath = join(dirname(outSrcPath), cssAssetFilename);

    log('[Build]', filePath + ' --> ' + outPath);
    tryRun(() => ensureDirectory(outDirPath, fs), `Ensure directory: ${outDirPath}`);
    let content: string = tryRun(
        () => fs.readFileSync(filePath).toString(),
        `Read File Error: ${filePath}`
    );
    const res = stylable.transform(content, filePath);
    const optimizer = new StylableOptimizer();
    if (optimize) {
        optimizer.optimize(
            {
                removeComments: true,
                removeEmptyNodes: true,
                removeStylableDirectives: true,
                classNameOptimizations: false,
                removeUnusedComponents: false,
            },
            res,
            {}
        );
    }
    handleDiagnostics(res, diagnosticsMsg, filePath);
    // st.css
    if (outputSources) {
        if (useSourceNamespace && !content.includes('st-namespace-reference')) {
            const relativePathToSource = relative(dirname(outSrcPath), filePath).replace(
                /\\/gm,
                '/'
            );
            const srcNamespaceAnnotation = `/* st-namespace-reference="${relativePathToSource}" */\n`;
            content = srcNamespaceAnnotation + content;
        }

        log('[Build]', 'output .st.css source');
        tryRun(() => fs.writeFileSync(outSrcPath, content), `Write File Error: ${outSrcPath}`);
    }
    // st.css.js
    moduleFormats.forEach((format) => {
        log('[Build]', 'moduleFormat', format);
        const code = tryRun(
            () =>
                createModuleSource(
                    res,
                    format,
                    includeCSSInJS,
                    undefined,
                    undefined,
                    undefined,
                    injectCSSRequest ? [`./${cssAssetFilename}`] : [],
                    '@stylable/runtime'
                ),
            `Transform Error: ${filePath}`
        );
        tryRun(
            () => fs.writeFileSync(outSrcPath + (format === 'esm' ? '.mjs' : '.js'), code),
            `Write File Error: ${outPath}`
        );
    });
    // .css
    if (outputCSS) {
        let cssCode = res.meta.outputAst!.toString();
        if (minify) {
            cssCode = optimizer.minifyCSS(cssCode);
        }
        log('[Build]', 'output transpiled css');
        tryRun(() => fs.writeFileSync(cssAssetOutPath, cssCode), `Write File Error: ${outPath}`);
    }
    // .d.ts?

    // copy assets?
    projectAssets.push(
        ...res.meta.urls.filter(isAsset).map((uri: string) => resolve(fileDirectory, uri))
    );
}
