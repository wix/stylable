import { isAsset, Stylable } from '@stylable/core';
import { createModuleSource } from '@stylable/module-utils';
import { dirname, join, resolve } from 'path';
import { ensureDirectory, handleDiagnostics, tryRun } from './build-tools';
import { Generator } from './default-generator';
import { FileSystem, findFiles } from './find-files';
import { generateFileIndexEntry, generateIndexFile } from './generate-index';
import { handleAssets } from './handle-assets';

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
    moduleFormats?: Array<'cjs' | 'esm'>;
    includeCSSInJS?: boolean;
    outputCSS?: boolean;
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
    moduleFormats,
    includeCSSInJS,
    outputCSS
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
                  moduleFormats || [],
                  includeCSSInJS,
                  outputCSS
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
    moduleFormats: string[],
    includeCSSInJS: boolean = false,
    outputCSS: boolean = false
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

    handleDiagnostics(diagnostics, res, diagnosticsMsg, filePath);
    // st.css
    tryRun(() => fs.writeFileSync(outSrcPath, content), `Write File Error: ${outSrcPath}`);
    // st.css.js
    moduleFormats.forEach(format => {
        const code = tryRun(
            () => createModuleSource(res, format, includeCSSInJS),
            `Transform Error: ${filePath}`
        );
        tryRun(
            () => fs.writeFileSync(outSrcPath + (format === 'esm' ? '.mjs' : '.js'), code),
            `Write File Error: ${outPath}`
        );
    });
    // .css
    if (outputCSS) {
        tryRun(
            () =>
                fs.writeFileSync(
                    outSrcPath.replace(/\.st\.css$/, '.css'),
                    res.meta.outputAst!.toString()
                ),
            `Write File Error: ${outPath}`
        );
    }
    // .d.ts?

    // copy assets
    projectAssets.push(
        ...res.meta.urls.filter(isAsset).map((uri: string) => resolve(fileDirectory, uri))
    );
}
