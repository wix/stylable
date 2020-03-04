import { isAsset, Stylable, StylableResults } from '@stylable/core';
import { generateModuleSource } from '@stylable/node';
import { dirname, join, relative, resolve } from 'path';
import { Generator } from './default-generator';
import { FileSystem, findFiles } from './find-files';

// const StylableWebpackPlugin = require('@stylable/webpack-plugin');
// const dt = require('dependency-tree');
// const webpack = require('webpack');

export interface BuildOptions {
    extension: string;
    fs: FileSystem;
    stylable: Stylable;
    rootDir: string;
    srcDir: string;
    outDir: string;
    log: (...args: string[]) => void;
    indexFile?: string;
    diagnostics?: (...args: string[]) => void;
    generatorPath?: string;
    outputJs?: boolean;
    outputSources?: boolean;
    useNamespaceReference?: boolean;
}

export async function build({
    extension,
    fs,
    stylable,
    rootDir,
    srcDir,
    outDir,
    log,
    diagnostics,
    indexFile,
    generatorPath,
    outputJs = true,
    outputSources = true,
    useNamespaceReference = false
}: BuildOptions) {
    const generatorModule = generatorPath
        ? require(resolve(generatorPath))
        : require('./default-generator');
    const generator: Generator = new generatorModule.Generator();
    const blacklist = new Set<string>(['node_modules']);
    const fullSrcDir = join(rootDir, srcDir);
    const fullOutDir = join(rootDir, outDir);
    const { result: filesToBuild } = findFiles(fs, fullSrcDir, extension, blacklist);
    const assets: string[] = [];
    const diagnosticsMsg: string[] = [];
    const indexFileOutput: Array<{ from: string; name: string }> = [];
    const nameMapping: { [key: string]: string } = {};

    if (filesToBuild.length === 0) {
        log('[Build]', 'No stylable files found. build skipped.');
    } else {
        log('[Build]', `Building ${filesToBuild.length} stylable files.`);
    }
    filesToBuild.forEach(filePath => {
        indexFile
            ? generateFileIndexEntry(
                  filePath,
                  nameMapping,
                  log,
                  indexFileOutput,
                  fullOutDir,
                  generator
              )
            : buildSingleFile(
                  fullOutDir,
                  filePath,
                  fullSrcDir,
                  log,
                  fs,
                  stylable,
                  diagnostics,
                  diagnosticsMsg,
                  assets,
                  outputJs,
                  outputSources,
                  useNamespaceReference
              );
    });

    if (indexFile && indexFileOutput.length) {
        generateIndexFile(indexFileOutput, fullOutDir, indexFile, log, fs);
    }

    if (diagnostics && diagnosticsMsg.length) {
        diagnostics(diagnosticsMsg.join('\n\n'));
    }

    if (!indexFile) {
        handleAssets(assets, rootDir, srcDir, outDir, fs);
    }
}

function generateIndexFile(
    indexFileOutput: Array<{ from: string; name: string }>,
    fullOutDir: string,
    indexFile: string,
    log: (...args: string[]) => void,
    fs: any
) {
    const indexFileContent = indexFileOutput
        .map(_ => createImportForComponent(_.from, _.name))
        .join('\n');
    const indexFileTargetPath = join(fullOutDir, indexFile);
    log('[Build]', 'creating index file: ' + indexFileTargetPath);

    ensureDirectory(fullOutDir, fs);
    tryRun(
        () => fs.writeFileSync(indexFileTargetPath, '\n' + indexFileContent + '\n'),
        'Write Index File Error'
    );
}

function handleAssets(assets: string[], rootDir: string, srcDir: string, outDir: string, fs: any) {
    const projectAssetMapping: {
        [key: string]: string;
    } = {};
    assets.forEach((originalPath: string) => {
        projectAssetMapping[originalPath] = originalPath.replace(
            join(rootDir, srcDir),
            join(rootDir, outDir)
        );
    });
    ensureAssets(projectAssetMapping, fs);
}

function buildSingleFile(
    fullOutDir: string,
    filePath: string,
    fullSrcDir: string,
    log: (...args: string[]) => void,
    fs: any,
    stylable: Stylable,
    diagnostics: ((...args: string[]) => void) | undefined,
    diagnosticsMsg: string[],
    projectAssets: string[],
    outputJs: boolean,
    outputSources: boolean,
    useSourceNamespace: boolean
) {
    // testBuild(filePath, fullSrcDir, fs);

    const outSrcPath = join(fullOutDir, filePath.replace(fullSrcDir, ''));
    const outPath = outSrcPath + '.js';
    const fileDirectory = dirname(filePath);
    const outDirPath = dirname(outPath);
    log('[Build]', filePath + ' --> ' + outPath);
    tryRun(() => ensureDirectory(outDirPath, fs), `Ensure directory: ${outDirPath}`);
    let content = tryRun(
        () => fs.readFileSync(filePath).toString(),
        `Read File Error: ${filePath}`
    );

    if (useSourceNamespace && !content.includes('st-namespace-reference')) {
        const relativePathToSource = relative(dirname(outSrcPath), filePath).replace(/\\/gm, '/');
        const srcNamespaceAnnotation = `/* st-namespace-reference="${relativePathToSource}" */\n`;
        content = srcNamespaceAnnotation + content;
    }

    const res = stylable.transform(content, filePath);
    const code = tryRun(() => generateModuleSource(res, true), `Transform Error: ${filePath}`);
    handleDiagnostics(diagnostics, res, diagnosticsMsg, filePath);

    // st.css
    if (outputSources) {
        tryRun(() => fs.writeFileSync(outSrcPath, content), `Write File Error: ${outSrcPath}`);
    }
    // st.css.js
    if (outputJs) {
        tryRun(() => fs.writeFileSync(outPath, code), `Write File Error: ${outPath}`);
    }
    projectAssets.push(
        ...res.meta.urls.filter(isAsset).map((uri: string) => resolve(fileDirectory, uri))
    );
}

// function testBuild(filePath: string, fullSrcDir: string, fs: any) {
//     debugger;
//     const x = dt({
//         filename: 'C:\\projects\\stylable\\packages\\cli\\test\\fixtures\\deps\\comp.js',
//         directory: 'C:\\projects\\stylable\\packages\\cli\\test\\fixtures',
//         // requireConfig: 'path/to/requirejs/config', // optional
//         // webpackConfig: 'path/to/webpack/config', // optional
//         // nodeModulesConfig: {
//         //     entry: 'module'
//         // }, // optional
//         filter: (path: string) => path.indexOf('node_modules') === -1,
//         nonExistent: [] // optional
//     });
//     console.log(x);
//     class StylableModuleEmit {
//         public apply(compiler: any) {
//             compiler.hooks.emit.tap('StylableModuleEmit', (_c: any) => {
//                 debugger;
//             });
//         }
//     }
//     const c = webpack({
//         entry: filePath,
//         context: fullSrcDir,
//         mode: 'production',
//         plugins: [
//             {
//                 apply(c: any) {
//                     c.inputFileSystem = fs;
//                     c.outputFileSystem = fs;
//                 }
//             },
//             new StylableWebpackPlugin(),
//             new StylableModuleEmit()
//         ]
//     });
//     c.run((_e: any, _s: any) => {
//         debugger;
//     });
// }

function generateFileIndexEntry(
    filePath: string,
    nameMapping: { [key: string]: string },
    log: (...args: string[]) => void,
    indexFileOutput: Array<{ from: string; name: string }>,
    fullOutDir: string,
    generator: Generator
) {
    const name = generator.generateImport(filePath).default;

    if (nameMapping[name]) {
        // prettier-ignore
        throw new Error(`Name Collision Error: ${nameMapping[name]} and ${filePath} has the same filename`);
    }
    log('[Build Index]', `Add file: ${filePath}`);
    nameMapping[name] = filePath;
    indexFileOutput.push({
        name,
        from: addDotSlash(relative(fullOutDir, filePath))
    });
}

function handleDiagnostics(
    diagnostics: ((...args: string[]) => void) | undefined,
    res: StylableResults,
    diagnosticsMsg: string[],
    filePath: string
) {
    const reports = res.meta.transformDiagnostics
        ? res.meta.diagnostics.reports.concat(res.meta.transformDiagnostics.reports)
        : res.meta.diagnostics.reports;

    if (diagnostics && reports.length) {
        diagnosticsMsg.push(`Errors in file: ${filePath}`);
        reports.forEach(report => {
            const err = report.node.error(report.message, report.options);
            diagnosticsMsg.push([report.message, err.showSourceCode()].join('\n'));
        });
    }
}

function tryRun<T>(fn: () => T, errorMessage: string): T {
    try {
        return fn();
    } catch (e) {
        throw new Error(errorMessage + ': \n' + e.stack);
    }
}

function createImportForComponent(from: string, defaultName: string) {
    return [
        `:import {-st-from: ${JSON.stringify(from)};-st-default:${defaultName};}`,
        `.root ${defaultName}{}`
    ].join('\n');
}

function addDotSlash(p: string) {
    p = p.replace(/\\/g, '/');
    return p.charAt(0) === '.' ? p : './' + p;
}

function ensureDirectory(dir: string, fs: FileSystem) {
    if (dir === '.' || fs.existsSync(dir)) {
        return;
    }

    try {
        fs.mkdirSync(dir);
    } catch (e) {
        const parentDir = dirname(dir);
        if (parentDir !== dir) {
            ensureDirectory(parentDir, fs);
            fs.mkdirSync(dir);
        }
    }
}
export function ensureAssets(projectAssetsMap: { [key: string]: string }, fs: FileSystem) {
    Object.keys(projectAssetsMap).map(assetOriginalPath => {
        if (fs.existsSync(assetOriginalPath)) {
            const content = fs.readFileSync(assetOriginalPath);
            const targetPath = projectAssetsMap[assetOriginalPath];
            const targetDir = dirname(targetPath);
            ensureDirectory(targetDir, fs);
            fs.writeFileSync(targetPath, content);
        }
    });
}
