import postcss from 'postcss';
import { processNamespace } from '@stylable/core';
import {
    emitDiagnostics,
    DiagnosticsMode,
    tryCollectImportsDeep,
} from '@stylable/core/dist/index-internal';
import { Warning, CssSyntaxError } from './warning.js';
import { getStylable } from './cached-stylable-factory.js';
import { createRuntimeTargetCode } from './create-runtime-target-code.js';
import { addBuildInfo } from './add-build-info.js';
import { createWebpackResolver } from '@stylable/webpack-plugin';
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

    const resolveModule = createWebpackResolver(
        this.fs as any,
        this._compiler!.options.resolve as any,
    );
    const stylable = getStylable(this._compiler!, {
        projectRoot: this.rootContext,
        fileSystem: this.fs as any,
        mode,
        resolveModule,
        resolveNamespace,
    });

    const { meta, exports } = stylable.transform(stylable.analyze(this.resourcePath, content));

    emitDiagnostics(this, meta, diagnosticsMode);
    for (const filePath of tryCollectImportsDeep(stylable.resolver, meta)) {
        this.addDependency(filePath);
    }

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

    postcss(plugins)
        .process(meta.targetAst!, {
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
                `,
            );
        })
        .catch((error) => {
            if (error.file) {
                this.addDependency(error.file);
            }

            callback(
                error.name === 'CssSyntaxError'
                    ? new CssSyntaxError(error)
                    : new Error('Failed to process css urls. caused by:\n' + error.stack),
            );
        });
};

export const loaderPath = __filename;
export default stylableLoader;
