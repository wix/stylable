import { basename, dirname, join, relative, resolve } from 'path';
import { isAsset, Stylable, StylableResults } from 'stylable';
import { generateModuleSource } from 'stylable-node';
import { FileSystem, findFiles } from './find-files';

// const StylableWebpackPlugin = require('stylable-webpack-plugin');
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
    indexFile
}: BuildOptions) {
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
            ? generateFileIndexEntry(filePath, nameMapping, log, indexFileOutput, fullOutDir)
            : buildSingleFile(
                  fullOutDir,
                  filePath,
                  fullSrcDir,
                  log,
                  fs,
                  stylable,
                  diagnostics,
                  diagnosticsMsg,
                  assets
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
    projectAssets: string[]
) {
    // testBuild(filePath, fullSrcDir, fs);

    const outSrcPath = join(fullOutDir, filePath.replace(fullSrcDir, ''));
    const outPath = outSrcPath + '.js';
    const fileDirectory = dirname(filePath);
    const outDirPath = dirname(outPath);
    log('[Build]', filePath + ' --> ' + outPath);
    tryRun(() => ensureDirectory(outDirPath, fs), `Ensure directory: ${outDirPath}`);
    const content = tryRun(
        () => fs.readFileSync(filePath).toString(),
        `Read File Error: ${filePath}`
    );
    const res = stylable.transform(content, filePath);
    const code = tryRun(() => generateModuleSource(res, true), `Transform Error: ${filePath}`);
    handleDiagnostics(diagnostics, res, diagnosticsMsg, filePath);
    // st.css
    tryRun(() => fs.writeFileSync(outSrcPath, content), `Write File Error: ${outSrcPath}`);
    // st.css.js
    tryRun(() => fs.writeFileSync(outPath, code), `Write File Error: ${outPath}`);
    projectAssets.push(...res.meta.urls.filter(isAsset).map((uri: string) => resolve(fileDirectory, uri)));
}

// function testBuild(filePath: string, fullSrcDir: string, fs: any) {
//     debugger;
//     const x = dt({
//         filename: 'C:\\projects\\stylable\\packages\\stylable-cli\\test\\fixtures\\deps\\comp.js',
//         directory: 'C:\\projects\\stylable\\packages\\stylable-cli\\test\\fixtures',
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
    fullOutDir: string
) {
    const name = filename2varname(basename(filePath));
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
    if (diagnostics && res.meta.diagnostics.reports.length) {
        diagnosticsMsg.push(`Errors in file: ${filePath}`);
        res.meta.diagnostics.reports.forEach(report => {
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

function filename2varname(filename: string) {
    return string2varname(filename.replace(/(?=.*)\.\w+$/, '').replace(/\.st$/, '')).replace(
        /^[a-z]/,
        (x: string) => {
            return x.toUpperCase();
        }
    );
}

function string2varname(str: string) {
    return str.replace(/[^0-9a-zA-Z_]/gm, '').replace(/^[^a-zA-Z_]+/gm, '');
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
