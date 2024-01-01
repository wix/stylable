import {
    type Stylable,
    type StylableResults,
    generateStylableJSModuleSource,
} from '@stylable/core';
import { isAsset, isRelativeNativeCss } from '@stylable/core/dist/index-internal';
import { generateDTSContent, generateDTSSourceMap } from '@stylable/module-utils';
import { StylableOptimizer } from '@stylable/optimizer';
import type { IFileSystem } from '@file-services/types';
import { hasImportedSideEffects, processUrlDependencies } from '@stylable/build-tools';
import { ensureDirectory, tryRun } from './build-tools';
import { nameTemplate } from './name-template';
import type { Log } from './logger';
import { DiagnosticsManager, DiagnosticsMode } from './diagnostics-manager';
import type { CLIDiagnostic } from './report-diagnostics';
import { errorMessages } from './messages';
import type { ModuleFormats } from './types';
import { fileToDataUri } from './file-to-data-uri';

export interface BuildCommonOptions {
    fullOutDir: string;
    filePath: string;
    fullSrcDir: string;
    log: Log;
    fs: IFileSystem;
    moduleFormats: ModuleFormats;
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
    resolveRuntimeRequest: (targetFilePath: string, moduleFormat: 'esm' | 'cjs') => string;
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
    useNamespaceReference = true,
    injectCSSRequest = false,
    optimize = false,
    minify = false,
    dts = false,
    dtsSourceMap,
    diagnosticsMode = 'loose',
    resolveRuntimeRequest,
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
                classNameOptimizations: false,
                removeUnusedComponents: false,
            },
            res,
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

    if (outputSources || outputCSS || dts || moduleFormats.length) {
        tryRun(() => ensureDirectory(outDirPath, fs), `Ensure directory: ${outDirPath}`);
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
    const ast = includeCSSInJS
        ? tryRun(
              () => inlineAssetsForJsModule(res, stylable, fs),
              `Inline assets failed for: ${filePath}`
          )
        : res.meta.targetAst!;

    moduleFormats.forEach(([format, ext]) => {
        outputLogs.push(`${format} module`);

        const moduleCssImports = collectImportsWithSideEffects(res, stylable, ext);
        const cssDepth = res.meta.transformCssDepth?.cssDepth ?? 0;
        if (injectCSSRequest) {
            moduleCssImports.push({ from: './' + cssAssetFilename });
        }

        const code = generateStylableJSModuleSource(
            {
                jsExports: res.exports,
                moduleType: format,
                namespace: res.meta.namespace,
                varType: 'var',
                imports: moduleCssImports,
                runtimeRequest: resolveRuntimeRequest(targetFilePath, format),
            },
            includeCSSInJS
                ? {
                      css: ast.toString(),
                      depth: cssDepth,
                      id: res.meta.namespace,
                      runtimeId: format,
                  }
                : undefined
        );
        const outFilePath = targetFilePath + ext;
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
        buildDTS({
            res,
            targetFilePath,
            generated,
            outputLogs,
            dtsSourceMap,
            sourceFilePath: outputSources ? undefined : filePath,
            writeFileSync: fs.writeFileSync,
            relative,
            dirname,
            isAbsolute,
        });
    }

    log(mode, `output: [${outputLogs.join(', ')}]`);
    // copy assets
    for (const url of res.meta.urls) {
        if (isAsset(url)) {
            projectAssets.add(resolve(fileDirectory, url));
        }
    }
    // add native css imports as assets
    for (const { request } of res.meta.getImportStatements()) {
        try {
            const resolvedRequest = stylable.resolver.resolvePath(fileDirectory, request);
            if (isRelativeNativeCss(resolvedRequest)) {
                projectAssets.add(resolvedRequest);
                buildSingleFile({
                    fullOutDir,
                    filePath: resolvedRequest,
                    fullSrcDir,
                    log,
                    fs,
                    moduleFormats,
                    outputCSS: false,
                    outputSources: false,
                    generated,
                    mode,
                    stylable,
                    includeCSSInJS,
                    projectAssets,
                    useNamespaceReference,
                    injectCSSRequest,
                    optimize,
                    minify,
                    dts: false,
                    dtsSourceMap: false,
                    diagnosticsMode,
                    diagnosticsManager,
                    resolveRuntimeRequest,
                });
            }
        } catch (_e) {
            // resolve diagnostics reported by core
        }
    }

    return {
        targetFilePath,
    };
}

export function buildDTS({
    res,
    targetFilePath,
    generated,
    outputLogs,
    dtsSourceMap,
    sourceFilePath,
    writeFileSync,
    relative,
    dirname,
    isAbsolute,
}: {
    res: StylableResults;
    targetFilePath: string;
    generated: Set<string>;
    outputLogs: string[];
    dtsSourceMap: boolean | undefined;
    sourceFilePath: string | undefined;
    writeFileSync: (path: string, data: string) => void;
    relative: (from: string, to: string) => string;
    dirname: (p: string) => string;
    isAbsolute: (p: string) => boolean;
}) {
    const dtsContent = generateDTSContent(res);
    const dtsPath = targetFilePath + '.d.ts';

    generated.add(dtsPath);
    outputLogs.push('output .d.ts');

    tryRun(() => writeFileSync(dtsPath, dtsContent), `Write File Error: ${dtsPath}`);

    // .d.ts.map
    // if not explicitly defined, assumed true with "--dts" parent scope
    if (dtsSourceMap !== false) {
        const relativeTargetFilePath = relative(
            dirname(targetFilePath),
            sourceFilePath || targetFilePath
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
            () => writeFileSync(dtsMapPath, dtsMappingContent),
            `Write File Error: ${dtsMapPath}`
        );
    }
}

function collectImportsWithSideEffects(res: StylableResults, stylable: Stylable, ext: string) {
    const moduleCssImports = [];

    for (const imported of res.meta.getImportStatements()) {
        let resolved = imported.request;
        try {
            resolved = stylable.resolver.resolvePath(imported.context, imported.request);
        } catch {
            // use the fallback
        }

        if (resolved.endsWith('.st.css')) {
            if (hasImportedSideEffects(stylable, res.meta, imported)) {
                // TODO: solve issue where request must be resolved before we add the extension
                moduleCssImports.push({ from: imported.request + ext });
            }
        }
        if (resolved.endsWith('.css')) {
            moduleCssImports.push({ from: imported.request + ext });
        }
    }
    return moduleCssImports;
}

function inlineAssetsForJsModule(res: StylableResults, stylable: Stylable, fs: IFileSystem) {
    const ast = res.meta.targetAst!.clone();
    processUrlDependencies({
        meta: { targetAst: ast, source: res.meta.source },
        rootContext: stylable.projectRoot,
        getReplacement: ({ absoluteRequest, url }) => {
            if (isAsset(url)) {
                let content = fs.readFileSync(absoluteRequest);
                if (typeof content === 'string') {
                    content = Buffer.from(content);
                }
                return fileToDataUri(absoluteRequest, content);
            }
            return url;
        },
        host: fs,
    });
    return ast;
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
    moduleFormats.forEach(([format, ext]) => {
        outputLogs.push(`${format} module`);
        const outFilePath = targetFilePath + ext;
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
