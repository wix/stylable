import type { RawSourceMap } from 'source-map';
import type { Compiler, Module } from 'webpack';

export type loaderCallback = (
    err: Error | undefined | null,
    content?: string | Buffer,
    sourceMap?: RawSourceMap
) => void;

export interface Loader extends Function {
    (this: LoaderContext, source: string | Buffer, sourceMap?: RawSourceMap):
        | string
        | Buffer
        | void
        | undefined;

    /**
     * The order of chained loaders are always called from right to left.
     * But, in some cases, loaders do not care about the results of the previous loader or the resource.
     * They only care for metadata. The pitch method on the loaders is called from left to right before the loaders are called (from right to left).
     * If a loader delivers a result in the pitch method the process turns around and skips the remaining loaders,
     * continuing with the calls to the more left loaders. data can be passed between pitch and normal call.
     */
    pitch?(remainingRequest: string, precedingRequest: string, data: any): any;

    /**
     * By default, the resource file is treated as utf-8 string and passed as String to the loader.
     * By setting raw to true the loader is passed the raw Buffer.
     * Every loader is allowed to deliver its result as String or as Buffer.
     * The compiler converts them between loaders.
     */
    raw?: boolean;
}

export interface LoaderContext {
    getOptions: () => any;
    /**
     * Loader API version. Currently 2.
     * This is useful for providing backwards compatibility.
     * Using the version you can specify custom logic or fallbacks for breaking changes.
     */
    version: string;

    /**
     *  The directory of the module. Can be used as context for resolving other stuff.
     *  In the example: /abc because resource.js is in this directory
     */
    context: string;

    /**
     * Starting with webpack 4, the formerly `this.options.context` is provided as `this.rootContext`.
     */
    rootContext: string;

    /**
     * The resolved request string.
     * In the example: "/abc/loader1.js?xyz!/abc/node_modules/loader2/index.js!/abc/resource.js?rrr"
     */
    request: string;

    /**
     *  A string or any object. The query of the request for the current loader.
     */
    query: any;

    /**
     * A data object shared between the pitch and the normal phase.
     */
    data?: any;

    callback: loaderCallback;

    /**
     * Make this loader async.
     */
    async(): loaderCallback | undefined;

    /**
     *  Make this loader result cacheable. By default it's not cacheable.
     *  A cacheable loader must have a deterministic result, when inputs and dependencies haven't changed.
     *  This means the loader shouldn't have other dependencies than specified with this.addDependency.
     *  Most loaders are deterministic and cacheable.
     */
    cacheable(flag?: boolean): void;

    /**
     * An array of all the loaders. It is writeable in the pitch phase.
     * loaders = [{request: string, path: string, query: string, module: function}]
     *
     * In the example:
     * [
     *   { request: "/abc/loader1.js?xyz",
     *     path: "/abc/loader1.js",
     *     query: "?xyz",
     *     module: [Function]
     *   },
     *   { request: "/abc/node_modules/loader2/index.js",
     *     path: "/abc/node_modules/loader2/index.js",
     *     query: "",
     *     module: [Function]
     *   }
     * ]
     */
    loaders: any[];

    /**
     * The index in the loaders array of the current loader.
     * In the example: in loader1: 0, in loader2: 1
     */
    loaderIndex: number;

    /**
     * The resource part of the request, including query.
     * In the example: "/abc/resource.js?rrr"
     */
    resource: string;

    /**
     * The resource file.
     * In the example: "/abc/resource.js"
     */
    resourcePath: string;

    /**
     * The query of the resource.
     * In the example: "?rrr"
     */
    resourceQuery: string;

    /**
     * Emit a warning.
     */
    emitWarning(message: string | Error): void;

    /**
     * Emit a error.
     */
    emitError(message: string | Error): void;

    /**
     * Execute some code fragment like a module.
     *
     * Don't use require(this.resourcePath), use this function to make loaders chainable!
     *
     */
    exec(code: string, filename: string): any;

    /**
     * Resolves the given request to a module, applies all configured loaders and calls
     * back with the generated source, the sourceMap and the module instance (usually an
     * instance of NormalModule). Use this function if you need to know the source code
     * of another module to generate the result.
     */
    loadModule(
        request: string,
        callback: (
            err: Error | null,
            source: string,
            sourceMap: RawSourceMap,
            module: Module
        ) => void
    ): any;

    /**
     * Resolve a request like a require expression.
     */
    resolve(context: string, request: string, callback: (err: Error, result: string) => void): any;

    /**
     * Resolve a request like a require expression.
     */
    resolveSync(context: string, request: string): string;

    /**
     * Adds a file as dependency of the loader result in order to make them watchable.
     * For example, html-loader uses this technique as it finds src and src-set attributes.
     * Then, it sets the url's for those attributes as dependencies of the html file that is parsed.
     */
    addDependency(file: string): void;

    /**
     * Adds a file as dependency of the loader result in order to make them watchable.
     * For example, html-loader uses this technique as it finds src and src-set attributes.
     * Then, it sets the url's for those attributes as dependencies of the html file that is parsed.
     */
    dependency(file: string): void;

    /**
     * Add a directory as dependency of the loader result.
     */
    addContextDependency(directory: string): void;

    /**
     * Remove all dependencies of the loader result. Even initial dependencies and these of other loaders. Consider using pitch.
     */
    clearDependencies(): void;

    /**
     * Pass values to the next loader.
     * If you know what your result exports if executed as module, set this value here (as a only element array).
     */
    value: any;

    /**
     * Passed from the last loader.
     * If you would execute the input argument as module, consider reading this variable for a shortcut (for performance).
     */
    inputValue: any;

    /**
     * A boolean flag. It is set when in debug mode.
     */
    debug: boolean;

    /**
     * Should the result be minimized.
     */
    minimize: boolean;

    /**
     * Should a SourceMap be generated.
     */
    sourceMap: boolean;

    /**
     * Target of compilation. Passed from configuration options.
     * Example values: "web", "node"
     */
    target:
        | 'web'
        | 'webworker'
        | 'async-node'
        | 'node'
        | 'electron-main'
        | 'electron-renderer'
        | 'node-webkit'
        | string;

    /**
     * This boolean is set to true when this is compiled by webpack.
     *
     * Loaders were originally designed to also work as Babel transforms.
     * Therefore if you write a loader that works for both, you can use this property to know if
     * there is access to additional loaderContext and webpack features.
     */
    webpack: boolean;

    /**
     * Emit a file. This is webpack-specific.
     */
    emitFile(name: string, content: Buffer | string, sourceMap: any): void;

    /**
     * Access to the compilation's inputFileSystem property.
     */
    fs: any;

    /**
     * Which mode is webpack running.
     */
    mode: 'production' | 'development' | 'none';

    /**
     * Hacky access to the Compilation object of webpack.
     */
    _compilation: any;

    /**
     * Hacky access to the Compiler object of webpack.
     */
    _compiler: Compiler;

    /**
     * Hacky access to the Module object being loaded.
     */
    _module: any;

    /** Flag if HMR is enabled */
    hot: boolean;
}

export interface OptionObject {
    [key: string]: null | false | true | string;
}

export function stringifyRequest(loaderContext: LoaderContext, resource: string): string;

export function isUrlRequest(url: string, root?: string): boolean;

export function getOptions(loaderContext: LoaderContext): Readonly<OptionObject>;
