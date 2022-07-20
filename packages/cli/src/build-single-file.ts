import type { Stylable, StylableResults } from '@stylable/core';
import { isAsset } from '@stylable/core/dist/index-internal';
import {
    createModuleSource,
    generateDTSContent,
    generateDTSSourceMap,
} from '@stylable/module-utils';
import { StylableOptimizer } from '@stylable/optimizer';
import { ensureDirectory, tryRun } from './build-tools';
import { nameTemplate } from './name-template';
import type { Log } from './logger';
import { DiagnosticsManager, DiagnosticsMode } from './diagnostics-manager';
import type { CLIDiagnostic } from './report-diagnostics';
import { errorMessages } from './messages';
import type { IFileSystem } from '@file-services/types';

export interface BuildCommonOptions {
    fullOutDir: string;
    filePath: string;
    fullSrcDir: string;
    log: Log;
    fs: IFileSystem;
    moduleFormats: string[];
    outputCSS?: boolean;
    outputCSSNameTemplate?: string;
    outputSources?: boolean;
    generated?: Set<string>;
    mode?: string;
    dts?: boolean;
    dtsSourceMap?: boolean;
    diagnosticsMode?: DiagnosticsMode;
}

export interface BuildFileOptions extends BuildCommonOptions {
    identifier?: string;
    stylable: Stylable;
    diagnosticsManager: DiagnosticsManager;
    projectAssets: Set<string>;
    includeCSSInJS?: boolean;
    useNamespaceReference?: boolean;
    injectCSSRequest?: boolean;
    optimize?: boolean;
    minify?: boolean;
}

export function buildSingleFile({
    fullOutDir,
    filePath,
    fullSrcDir,
    identifier = fullSrcDir,
    log,
    fs,
    moduleFormats,
    outputCSS = false,
    outputCSSNameTemplate = '[filename].css',
    outputSources = false,
    generated = new Set<string>(),
    mode = '[Build]',
    // build specific
    stylable,
    includeCSSInJS = false,
    projectAssets,
    useNamespaceReference = false,
    injectCSSRequest = false,
    optimize = false,
    minify = false,
    dts = false,
    dtsSourceMap,
    diagnosticsMode = 'loose',
    diagnosticsManager = new DiagnosticsManager({ log }),
}: BuildFileOptions) {
    const { basename, dirname, join, relative, resolve, isAbsolute } = fs;
    const targetFilePath = join(fullOutDir, relative(fullSrcDir, filePath));
    const outPath = targetFilePath + '.js';
    const fileDirectory = dirname(filePath);
    const outDirPath = dirname(outPath);
    const cssAssetFilename = nameTemplate(outputCSSNameTemplate, {
        filename: basename(targetFilePath, '.st.css'),
    });
    const cssAssetOutPath = join(dirname(targetFilePath), cssAssetFilename);
    const outputLogs: string[] = [];
    log(mode, filePath);

    tryRun(() => ensureDirectory(outDirPath, fs), `Ensure directory: ${outDirPath}`);
    let content: string = tryRun(
        () => fs.readFileSync(filePath).toString(),
        `Read File Error: ${filePath}`
    );
    const res = tryRun(
        () => stylable.transform(stylable.analyze(filePath)),
        errorMessages.STYLABLE_PROCESS(filePath)
    );
    const optimizer = new StylableOptimizer();
    if (optimize) {
        optimizer.optimize(
            {
                removeComments: true,
                removeEmptyNodes: true,
                removeStylableDirectives: true,
                removeUnusedComponents: false,
                shortNamespaces: false,
                classNameOptimizations: false,
            },
            res.meta.targetAst!,
            // since we are only doing cosmetic optimizations, we can provide an empty usage mapping and empty globals
            {},
            res.exports,
            {}
        );
    }

    const diagnostics = getAllDiagnostics(res);
    if (diagnostics.length) {
        diagnosticsManager.set(identifier, filePath, {
            diagnosticsMode,
            diagnostics,
        });
    }

    // st.css
    if (outputSources) {
        if (targetFilePath === filePath) {
            throw new Error(`Attempt to override source file ${targetFilePath}`);
        }
        if (useNamespaceReference && !content.includes('st-namespace-reference')) {
            const relativePathToSource = relative(dirname(targetFilePath), filePath).replace(
                /\\/gm,
                '/'
            );
            const srcNamespaceAnnotation = `\n/* st-namespace-reference="${relativePathToSource}" */`;
            content += srcNamespaceAnnotation;
        }
        generated.add(targetFilePath);
        outputLogs.push(`.st.css source`);
        tryRun(
            () => fs.writeFileSync(targetFilePath, content),
            `Write File Error: ${targetFilePath}`
        );
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
        const outFilePath = targetFilePath + (format === 'esm' ? '.mjs' : '.js');
        generated.add(outFilePath);
        tryRun(() => fs.writeFileSync(outFilePath, code), `Write File Error: ${outFilePath}`);
    });
    // .css
    if (outputCSS) {
        let cssCode = res.meta.targetAst!.toString();
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
    // .d.ts
    if (dts) {
        const dtsContent = generateDTSContent(res);
        const dtsPath = targetFilePath + '.d.ts';

        generated.add(dtsPath);
        outputLogs.push('output .d.ts');

        tryRun(() => fs.writeFileSync(dtsPath, dtsContent), `Write File Error: ${dtsPath}`);

        // .d.ts.map
        // if not explicitly defined, assumed true with "--dts" parent scope
        if (dtsSourceMap !== false) {
            const relativeTargetFilePath = relative(
                dirname(targetFilePath),
                outputSources ? targetFilePath : filePath
            );

            const dtsMappingContent = generateDTSSourceMap(
                dtsContent,
                res.meta,
                // `relativeTargetFilePath` could be an absolute path in windows (e.g. unc path)
                isAbsolute(relativeTargetFilePath)
                    ? relativeTargetFilePath
                    : relativeTargetFilePath.replace(/\\/g, '/')
            );

            const dtsMapPath = targetFilePath + '.d.ts.map';

            generated.add(dtsMapPath);
            outputLogs.push('output .d.ts.mp');

            tryRun(
                () => fs.writeFileSync(dtsMapPath, dtsMappingContent),
                `Write File Error: ${dtsMapPath}`
            );
        }
    }

    log(mode, `output: [${outputLogs.join(', ')}]`);
    // copy assets
    for (const url of res.meta.urls) {
        if (isAsset(url)) {
            projectAssets.add(resolve(fileDirectory, url));
        }
    }

    return {
        targetFilePath,
    };
}

export function removeBuildProducts({
    fullOutDir,
    filePath,
    fullSrcDir,
    log,
    fs,
    moduleFormats,
    outputCSS = false,
    outputCSSNameTemplate = '[filename].css',
    outputSources = false,
    generated = new Set<string>(),
    mode = '[Build]',
    dts = false,
    dtsSourceMap,
}: BuildCommonOptions) {
    const { basename, dirname, join, relative } = fs;
    const targetFilePath = join(fullOutDir, relative(fullSrcDir, filePath));
    const cssAssetFilename = nameTemplate(outputCSSNameTemplate, {
        filename: basename(targetFilePath, '.st.css'),
    });
    const cssAssetOutPath = join(dirname(targetFilePath), cssAssetFilename);
    const outputLogs: string[] = [];
    log(mode, filePath);

    // st.css
    if (outputSources) {
        if (targetFilePath === filePath) {
            throw new Error(`Attempt to remove source file ${targetFilePath}`);
        }
        generated.delete(targetFilePath);
        outputLogs.push(`.st.css source`);
        tryRun(() => fs.unlinkSync(targetFilePath), `Unlink File Error: ${targetFilePath}`);
    }
    // st.css.js
    moduleFormats.forEach((format) => {
        outputLogs.push(`${format} module`);
        const outFilePath = targetFilePath + (format === 'esm' ? '.mjs' : '.js');
        generated.delete(outFilePath);
        tryRun(() => fs.unlinkSync(outFilePath), `Unlink File Error: ${outFilePath}`);
    });
    // .css
    if (outputCSS) {
        generated.delete(cssAssetOutPath);
        outputLogs.push('transpiled css');
        tryRun(() => fs.unlinkSync(cssAssetOutPath), `Unlink File Error: ${cssAssetOutPath}`);
    }
    // .d.ts
    if (dts) {
        const dtsPath = `${targetFilePath}.d.ts`;
        generated.delete(dtsPath);
        outputLogs.push('generated .d.ts');
        tryRun(() => fs.unlinkSync(dtsPath), `Unlink File Error: ${dtsPath}`);
    }
    // .d.ts.map
    if (dtsSourceMap) {
        const dtsMapPath = `${targetFilePath}.d.ts.map`;
        generated.delete(dtsMapPath);
        outputLogs.push('generated .d.ts.map');
        tryRun(() => fs.unlinkSync(dtsMapPath), `Unlink File Error: ${dtsMapPath}`);
    }

    log(mode, `removed: [${outputLogs.join(', ')}]`);

    return {
        targetFilePath,
    };
}

export function getAllDiagnostics(res: StylableResults): CLIDiagnostic[] {
    const diagnostics = res.meta.transformDiagnostics
        ? res.meta.diagnostics.reports.concat(res.meta.transformDiagnostics.reports)
        : res.meta.diagnostics.reports;

    return diagnostics.map(({ message, node, word, severity, code }) => {
        const err = node.error(message, { word });
        const diagnostic: CLIDiagnostic = {
            severity,
            node,
            code,
            message: `${message}\n${err.showSourceCode(true)}`,
            ...(node.source?.start && {}),
        };

        return diagnostic;
    });
}
