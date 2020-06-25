import { Stylable, processNamespace } from '@stylable/core';
import { StylableOptimizer } from '@stylable/optimizer';
import { loader } from 'webpack';
import { getOptions, isUrlRequest, stringifyRequest } from 'loader-utils';
import { Warning } from './warning';
import postcss from 'postcss';
import { addMetaDependencies } from './add-meta-dependencies';
import { getStylable } from './cached-stylable-factory';

// TODO: maybe adopt the code
const { urlParser } = require('css-loader/dist/plugins');
const { getImportCode, getModuleCode } = require('css-loader/dist/utils');
const decache = require('decache');

export let stylable: Stylable;

export interface LoaderOptions {
    resolveNamespace(namespace: string, filePath: string): string;
    filterUrls(url: string, ctx: loader.LoaderContext): boolean;
}

const defaultOptions: LoaderOptions = {
    resolveNamespace: processNamespace,
    filterUrls(_url: string, _ctx: loader.LoaderContext) {
        return true;
    },
};
interface UrlReplacement {
    pluginName: string;
    type: 'url-replacement';
    value: { replacementName: string; importName: string; hash: string; needQuotes: boolean };
}
interface LoaderImport {
    pluginName: string;
    type: 'import';
    value: {
        importName: string;
        url: string;
    };
}

const timedCacheOptions = { useTimer: true, timeout: 1000 };
const requireModule = (id: string) => {
    decache(id);
    return require(id);
};
const optimizer = new StylableOptimizer();

const stylableLoader: loader.Loader = function (content) {
    const callback = this.async();

    if (!callback) {
        throw new Error('Webpack callback is missing from loader API');
    }

    if (typeof content !== 'string') {
        throw new Error('content is not string');
    }

    const { filterUrls, resolveNamespace }: LoaderOptions = {
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

    const res = stylable.transform(content, this.resourcePath);
    const imports: LoaderImport[] = [];
    const urlReplacements: UrlReplacement[] = [];

    addMetaDependencies(
        res.meta,
        ({ source }) => this.addDependency(source),
        stylable.createTransformer()
    );

    const plugins = [
        urlParser({
            filter: (value: string) => isUrlRequest(value) && filterUrls(value, this),
            urlHandler: (url: string) => stringifyRequest(this, url),
        }),
    ];
    if (mode !== 'development') {
        optimizer.removeStylableDirectives(res.meta.outputAst!);
    }

    postcss(plugins)
        .process(res.meta.outputAst!, {
            from: this.resourcePath,
            to: this.resourcePath,
            map: false,
        })
        .then((result) => {
            for (const warning of result.warnings()) {
                this.emitWarning(new Warning(warning));
            }

            for (const message of result.messages) {
                switch (message.type) {
                    case 'import':
                        imports.push(message.value);
                        break;
                    case 'url-replacement':
                        urlReplacements.push(message.value);
                        break;
                    default:
                        break;
                }
            }

            const esModule = false;

            const importCode = getImportCode(this, 'full', imports, esModule);
            const moduleCode = getModuleCode(
                result,
                'full',
                false /* sourceMap */,
                [] /* apiImport */,
                urlReplacements,
                [] /* icssReplacement */,
                esModule
            );

            return callback(
                null,
                `
                ${importCode}
                ${moduleCode}

                // Patch exports with custom stylable API
                exports.locals = ${JSON.stringify([res.meta.namespace, res.exports])}

                module.exports = exports;
                `
            );
        })
        .catch(() => {
            throw new Error('Failed to process css urls');
        });
};

export const loaderPath = __filename;
export default stylableLoader;
