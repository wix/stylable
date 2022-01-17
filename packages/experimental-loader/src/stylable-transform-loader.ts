import postcss from 'postcss';
import {
    processNamespace,
    emitDiagnostics,
    visitMetaCSSDependenciesBFS,
    DiagnosticsMode,
    MinimalFS,
} from '@stylable/core';
import { StylableOptimizer } from '@stylable/optimizer';
import { Warning, CssSyntaxError } from './warning';
import { getStylable } from './cached-stylable-factory';
import { createRuntimeTargetCode } from './create-runtime-target-code';
import { addBuildInfo } from './add-build-info';
import type { LoaderDefinition, LoaderContext } from 'webpack';

// TODO: maybe adopt the code
const { urlParser } = require('css-loader/dist/plugins');
const { getImportCode, getModuleCode, sort } = require('css-loader/dist/utils');
const cssLoaderRuntimeApiPath = require.resolve('css-loader/dist/runtime/api');
const cssLoaderNoSourceMapRuntime = require.resolve('css-loader/dist/runtime/noSourceMaps');
const { isUrlRequest } = require('loader-utils');

export interface LoaderOptions {
    resolveNamespace(namespace: string, filePath: string): string;
    filterUrls(url: string, ctx: LoaderContext<{}>): boolean;
    exportsOnly: boolean;
    diagnosticsMode: DiagnosticsMode;
}

const defaultOptions: LoaderOptions = {
    resolveNamespace: processNamespace,
    exportsOnly: false,
    diagnosticsMode: 'auto',
    filterUrls(_url: string, _ctx: LoaderContext<{}>) {
        return true;
    },
};

interface UrlReplacement {
    replacementName: string;
    importName: string;
    hash: string;
    needQuotes: boolean;
}
interface LoaderImport {
    type: string;
    importName: string;
    url: string;
    index: number;
}

const optimizer = new StylableOptimizer();

const stylableLoader: LoaderDefinition = function (content) {
    const callback = this.async();

    if (!callback) {
        throw new Error('Webpack callback is missing from loader API');
    }

    if (typeof content !== 'string') {
        throw new Error('content is not string');
    }

    const { filterUrls, resolveNamespace, exportsOnly, diagnosticsMode }: LoaderOptions = {
        ...defaultOptions,
        ...this.getOptions(),
    };
    const mode = this._compiler!.options.mode === 'development' ? 'development' : 'production';

    const stylable = getStylable(this._compiler!, {
        projectRoot: this.rootContext,
        fileSystem: this.fs as unknown as MinimalFS,
        mode,
        resolveOptions: this._compiler!.options.resolve,
        resolveNamespace,
    });

    const { meta, exports } = stylable.transform(content, this.resourcePath);

    emitDiagnostics(this, meta, diagnosticsMode);

    visitMetaCSSDependenciesBFS(
        meta,
        ({ source }) => this.addDependency(source),
        stylable.resolver
    );

    addBuildInfo(this, meta.namespace);

    if (exportsOnly) {
        return callback(null, createRuntimeTargetCode(meta.namespace, exports));
    }

    const urlPluginImports: LoaderImport[] = [
        {
            type: 'api_import',
            importName: '___CSS_LOADER_API_IMPORT___',
            url: JSON.stringify(this.utils.contextify(this.context, cssLoaderRuntimeApiPath)),
            index: -1,
        },
        {
            type: 'api_sourcemap_import',
            importName: '___CSS_LOADER_API_NO_SOURCEMAP_IMPORT___',
            url: JSON.stringify(this.utils.contextify(this.context, cssLoaderNoSourceMapRuntime)),
            index: 0,
        },
    ];

    const urlReplacements: UrlReplacement[] = [];

    const urlResolver = (this as any).getResolve({
        conditionNames: ['asset'],
        mainFields: ['asset'],
        mainFiles: [],
        extensions: [],
    });

    const plugins = [
        urlParser({
            imports: urlPluginImports,
            replacements: urlReplacements,
            context: this.context,
            rootContext: this.rootContext,
            resolver: urlResolver,
            filter: (value: string) => isUrlRequest(value) && filterUrls(value, this),
            urlHandler: (url: string) => JSON.stringify(this.utils.contextify(this.context, url)),
        }),
    ];

    if (mode !== 'development') {
        optimizer.removeStylableDirectives(meta.outputAst!);
    }

    postcss(plugins)
        .process(meta.outputAst!, {
            from: this.resourcePath,
            to: this.resourcePath,
            map: false,
        })
        .then((result) => {
            for (const warning of result.warnings()) {
                this.emitWarning(new Warning(warning));
            }

            const importCode = getImportCode(urlPluginImports.sort(sort), { esModule: false });
            const moduleCode = getModuleCode(result, [], urlReplacements, {
                modules: {},
                sourceMap: false,
            });

            return callback(
                null,
                `
                ${importCode}
                ${moduleCode}

                // Patch exports with custom stylable API
                ___CSS_LOADER_EXPORT___.locals = ${JSON.stringify([meta.namespace, exports])}

                module.exports = ___CSS_LOADER_EXPORT___;
                `
            );
        })
        .catch((error) => {
            if (error.file) {
                this.addDependency(error.file);
            }

            callback(
                error.name === 'CssSyntaxError'
                    ? new CssSyntaxError(error)
                    : new Error('Failed to process css urls. caused by:\n' + error.stack)
            );
        });
};

export const loaderPath = __filename;
export default stylableLoader;
