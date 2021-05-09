import { isAsset, Stylable } from '@stylable/core';
import { createModuleSource } from '@stylable/module-utils';
import { StylableOptimizer } from '@stylable/optimizer';
import { ensureDirectory, handleDiagnostics, tryRun } from './build-tools';
import { nameTemplate } from './name-template';

export interface BuildFileOptions {
    fullOutDir: string;
    filePath: string;
    fullSrcDir: string;
    log: (...args: string[]) => void;
    fs: any;
    stylable: Stylable;
    diagnosticsMessages: Map<string, string[]>;
    projectAssets: Set<string>;
    moduleFormats: string[];
    mode?: string;
    includeCSSInJS?: boolean;
    outputCSS?: boolean;
    outputCSSNameTemplate?: string;
    outputSources?: boolean;
    useSourceNamespace?: boolean;
    injectCSSRequest?: boolean;
    optimize?: boolean;
    minify?: boolean;
    generated?: Set<string>;
}

export function buildSingleFile({
    fullOutDir,
    filePath,
    fullSrcDir,
    log,
    fs,
    stylable,
    diagnosticsMessages,
    projectAssets,
    moduleFormats,
    includeCSSInJS = false,
    outputCSS = false,
    outputCSSNameTemplate = '[filename].css',
    outputSources = false,
    useSourceNamespace = false,
    injectCSSRequest = false,
    optimize = false,
    minify = false,
    generated = new Set<string>(),
    mode = '[Build]',
}: BuildFileOptions) {
    const { basename, dirname, join, relative, resolve } = fs;
    const outSrcPath = join(fullOutDir, filePath.replace(fullSrcDir, ''));
    const outPath = outSrcPath + '.js';
    const fileDirectory = dirname(filePath);
    const outDirPath = dirname(outPath);
    const cssAssetFilename = nameTemplate(outputCSSNameTemplate, {
        filename: basename(outSrcPath, '.st.css'),
    });
    const cssAssetOutPath = join(dirname(outSrcPath), cssAssetFilename);
    const outputLogs: string[] = [];
    log(mode, filePath);

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
    handleDiagnostics(res, diagnosticsMessages, filePath);
    // st.css
    if (outputSources) {
        if (outSrcPath === filePath) {
            throw new Error(`Attempt to override source file ${outSrcPath}`);
        }
        if (useSourceNamespace && !content.includes('st-namespace-reference')) {
            const relativePathToSource = relative(dirname(outSrcPath), filePath).replace(
                /\\/gm,
                '/'
            );
            const srcNamespaceAnnotation = `/* st-namespace-reference="${relativePathToSource}" */\n`;
            content = srcNamespaceAnnotation + content;
        }
        generated.add(outSrcPath);
        outputLogs.push(`.st.css source`);
        tryRun(() => fs.writeFileSync(outSrcPath, content), `Write File Error: ${outSrcPath}`);
    }
    // st.css.js
    moduleFormats.forEach((format) => {
        outputLogs.push(`${format} module`);
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
        const outFilePath = outSrcPath + (format === 'esm' ? '.mjs' : '.js');
        generated.add(outFilePath);
        tryRun(() => fs.writeFileSync(outFilePath, code), `Write File Error: ${outFilePath}`);
    });
    // .css
    if (outputCSS) {
        let cssCode = res.meta.outputAst!.toString();
        if (minify) {
            cssCode = optimizer.minifyCSS(cssCode);
        }
        generated.add(cssAssetOutPath);
        outputLogs.push('transpiled css');
        tryRun(
            () => fs.writeFileSync(cssAssetOutPath, cssCode),
            `Write File Error: ${cssAssetOutPath}`
        );
    }
    // .d.ts?

    log(mode, `output: [${outputLogs.join(', ')}]`);
    // copy assets
    for (const url of res.meta.urls) {
        if (isAsset(url)) {
            projectAssets.add(resolve(fileDirectory, url));
        }
    }
}
