import postcss from 'postcss';
import decache from 'decache';
import {
    Stylable,
    processNamespace,
    emitDiagnostics,
    visitMetaCSSDependencies,
} from '@stylable/core';
import { StylableOptimizer } from '@stylable/optimizer';
import { Warning, CssSyntaxError } from './warning';
import { getStylable } from './cached-stylable-factory';
import { createRuntimeTargetCode } from './create-runtime-target-code';
import type { LoaderContext, Loader } from 'typings/webpack5';

// TODO: maybe adopt the code
const { urlParser } = require('css-loader/dist/plugins');
const { getImportCode, getModuleCode, sort } = require('css-loader/dist/utils');
const cssLoaderRuntimeApiPath = require.resolve('css-loader/dist/runtime/api');
const { getOptions, isUrlRequest, stringifyRequest } = require('loader-utils');

export let stylable: Stylable;

export interface LoaderOptions {
    resolveNamespace(namespace: string, filePath: string): string;
    filterUrls(url: string, ctx: LoaderContext): boolean;
    exportsOnly: boolean;
    diagnosticsMode: 'auto' | 'strict' | 'loose';
}

const defaultOptions: LoaderOptions = {
    resolveNamespace: processNamespace,
    exportsOnly: false,
    diagnosticsMode: 'auto',
    filterUrls(_url: string, _ctx: LoaderContext) {
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
    importName: string;
    url: string;
    index: number;
}

const timedCacheOptions = { useTimer: true, timeout: 1000 };
const requireModule = (id: string) => {
    decache(id);
    return require(id);
};
const optimizer = new StylableOptimizer();

const stylableLoader: Loader = function (content) {
    const callback = this.async();

    if (!callback) {
        throw new Error('Webpack callback is missing from loader API');
    }

    if (typeof content !== 'string') {
        throw new Error('content is not string');
    }

    const { filterUrls, resolveNamespace, exportsOnly, diagnosticsMode }: LoaderOptions = {
        ...defaultOptions,
        ...getOptions(this),
    };
    const mode = this._compiler.options.mode === 'development' ? 'development' : 'production';

    stylable = getStylable(this._compiler, {
        projectRoot: this.rootContext,
        fileSystem: this.fs,
        mode,
        resolveOptions: this._compiler.options.resolve as any /* make stylable types better */,
        timedCacheOptions,
        resolveNamespace,
        requireModule,
    });

    const { meta, exports } = stylable.transform(content, this.resourcePath);

    emitDiagnostics(this, meta, diagnosticsMode);

    visitMetaCSSDependencies(
        meta,
        ({ source }) => this.addDependency(source),
        stylable.resolver
    );

    if (exportsOnly) {
        return callback(null, createRuntimeTargetCode(meta.namespace, exports));
    }

    const urlPluginImports: LoaderImport[] = [
        {
            importName: '___CSS_LOADER_API_IMPORT___',
            url: stringifyRequest(this, cssLoaderRuntimeApiPath),
            index: -1,
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
            urlHandler: (url: string) => stringifyRequest(this, url),
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
