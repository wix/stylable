import { join, normalize } from 'path';
import playwright from 'playwright-core';
import rimrafCallback from 'rimraf';
import { promisify } from 'util';
import webpack from 'webpack';
import { nodeFs } from '@file-services/node';
import { mkdtempSync, rmdirSync, symlinkSync, existsSync } from 'fs';
import { deferred } from 'promise-assist';
import { runServer } from './run-server';
import { tmpdir } from 'os';

export interface Options {
    projectDir: string;
    port?: number;
    launchOptions: playwright.LaunchOptions;
    webpackOptions?: webpack.Configuration;
    throwOnBuildError?: boolean;
    configName?: string;
    log?: boolean;
}

type MochaHook = import('mocha').HookFunction;
type Assets = Record<string, { source(): string; emitted: boolean; distPath: string }>;
const rimraf = promisify(rimrafCallback);

export class ProjectRunner {
    public static mochaSetup(
        runnerOptions: Options,
        before: MochaHook,
        afterEach: MochaHook,
        after: MochaHook,
        watch = false,
        watchedDir = ''
    ) {
        const disposeAfterEach: Set<() => void> = new Set();
        if (watch) {
            const projectToCopy = runnerOptions.projectDir;
            if (watchedDir && existsSync(watchedDir)) {
                rmdirSync(watchedDir, { recursive: true });
            }
            const tempPath = watchedDir || mkdtempSync(join(tmpdir(), 'local-test'));
            const removeTemp = () => rmdirSync(tempPath, { recursive: true });
            const projectPath = join(tempPath, 'project');
            disposeAfterEach.add(removeTemp);
            nodeFs.copyDirectorySync(projectToCopy, projectPath);
            symlinkSync(
                join(__dirname, '../../../node_modules'),
                join(tempPath, 'node_modules'),
                'junction'
            );
            runnerOptions.projectDir = projectPath;
        }

        const projectRunner = new this(runnerOptions);

        before('bundle and serve project', async function () {
            this.timeout(40000);
            watch ? await projectRunner.watch() : await projectRunner.bundle();
            await projectRunner.serve();
        });

        afterEach('cleanup open pages', async () => {
            await projectRunner.closeAllPages();
        });

        after('destroy runner', async () => {
            await projectRunner.destroy();
        });

        return projectRunner;
    }
    public projectDir: string;
    public outputDir: string;
    public webpackConfig: webpack.Configuration;
    public port: number;
    public launchOptions: playwright.LaunchOptions;
    public pages: playwright.Page[];
    public stats: webpack.Stats | null | undefined;
    public throwOnBuildError: boolean;
    public serverUrl: string;
    public server!: { close(): void } | null;
    public browser!: playwright.Browser | null;
    public compiler!: webpack.Compiler | null;
    public watchingHandle!: ReturnType<webpack.Compiler['watch']> | null;
    public log: typeof console.log;
    constructor({
        projectDir,
        port = 3000,
        launchOptions = {},
        throwOnBuildError = true,
        webpackOptions,
        configName = 'webpack.config',
        log = false,
    }: Options) {
        this.projectDir = projectDir;
        this.outputDir = join(this.projectDir, 'dist');
        this.webpackConfig = this.loadTestConfig(configName, webpackOptions);
        this.port = port;
        this.serverUrl = `http://localhost:${this.port}`;
        this.launchOptions = launchOptions;
        this.pages = [];
        this.stats = undefined;
        this.throwOnBuildError = throwOnBuildError;
        this.log = log
            ? console.log.bind(console, '[ProjectRunner]')
            : () => {
                  /*noop*/
              };
    }
    public loadTestConfig(configName?: string, webpackOptions: webpack.Configuration = {}) {
        const config = require(join(this.projectDir, configName || 'webpack.config'));
        return {
            ...(config.default || config),
            ...webpackOptions,
        };
    }
    public async bundle() {
        this.log('Bundle Start');
        const webpackConfig = this.getWebpackConfig();
        const compiler = webpack(webpackConfig);
        this.compiler = compiler;
        // compiler.run = compiler.run.bind(compiler);
        const run = () => {
            return new Promise<webpack.Stats | undefined>((res, rej) =>
                compiler.run((err, stats) => (err ? rej(err) : res(stats)))
            );
        };
        this.stats = await run();
        if (this.throwOnBuildError && this.stats?.hasErrors()) {
            throw new Error(this.stats.toString({ colors: true }));
        }
        this.log('Bundle Finished');
    }
    public async watch() {
        this.log('Watch Start');
        const webpackConfig = this.getWebpackConfig();
        const compiler = webpack(webpackConfig);
        this.compiler = compiler;

        const firstCompile = deferred<webpack.Stats>();

        this.watchingHandle = compiler.watch({}, (err, stats) => {
            if (!this.stats) {
                if (this.throwOnBuildError && stats?.hasErrors()) {
                    err = new Error(stats?.compilation.errors.join('\n'));
                }
                if (err) {
                    firstCompile.reject(err);
                } else {
                    firstCompile.resolve(stats);
                }
            }
            this.stats = stats;
        });

        await firstCompile.promise;
        this.log('Finished Initial Compile');
    }

    public async serve() {
        const { server, serverUrl } = await runServer(this.outputDir, this.port, this.log);
        this.serverUrl = serverUrl;
        this.server = server;
    }
    public waitForRecompile() {
        let done = false;
        return new Promise<void>((res) => {
            this.compiler?.hooks.afterDone.tap('waitForRecompile', () => {
                if (done) {
                    return;
                }
                done = true;
                res();
            });
        });
    }
    public async actAndWaitForRecompile(
        actionDesc: string,
        action: () => Promise<void> | void,
        validate: () => Promise<void> | void = () => Promise.resolve()
    ) {
        try {
            const recompile = this.waitForRecompile();
            await action();
            await recompile;
            await validate();
        } catch (e) {
            e.message = actionDesc + '\n' + e.message;
            throw e;
        }
    }
    public async openInBrowser() {
        if (!this.browser) {
            this.browser = await playwright.chromium.launch(this.launchOptions);
        }
        const browserContext = await this.browser.newContext();
        const page = await browserContext.newPage();
        this.pages.push(page);

        const responses: playwright.Response[] = [];
        page.on('response', (response) => {
            responses.push(response);
        });
        await page.goto(this.serverUrl, { waitUntil: 'networkidle' });
        return { page, responses };
    }

    public getBuildWarningMessages(): webpack.Compilation['warnings'] {
        return this.stats!.compilation.warnings.slice();
    }

    public getBuildErrorMessages(): webpack.Compilation['errors'] {
        return this.stats!.compilation.errors.slice();
    }

    public getBuildErrorMessagesDeep() {
        function getErrors(compilations: webpack.Compilation[]) {
            return compilations.reduce((errors, compilation) => {
                errors.push(...compilation.errors);
                errors.push(...getErrors(compilation.children));
                return errors;
            }, [] as any[]);
        }

        return getErrors([this.stats!.compilation]);
    }
    public getBuildWarningsMessagesDeep() {
        function getWarnings(compilations: webpack.Compilation[]) {
            return compilations.reduce((warnings, compilation) => {
                warnings.push(...compilation.warnings);
                warnings.push(...getWarnings(compilation.children));
                return warnings;
            }, [] as any[]);
        }

        return getWarnings([this.stats!.compilation]);
    }

    public getBuildAsset(assetPath: string) {
        return nodeFs.readFileSync(
            join(this.stats?.compilation.options.output.path || '', normalize(assetPath)),
            'utf-8'
        );
    }

    public getBuildAssets(): Assets {
        return Object.keys(this.stats!.compilation.assets).reduce<Assets>((acc, assetPath) => {
            acc[assetPath] = {
                distPath: join(
                    this.stats?.compilation.options.output.path || '',
                    normalize(assetPath)
                ),
                source() {
                    return nodeFs.readFileSync(this.distPath, 'utf8');
                },
                get emitted() {
                    return nodeFs.existsSync(this.distPath);
                },
            };
            return acc;
        }, {});
    }

    public evalAssetModule(source: string, publicPath = ''): any {
        const _module = { exports: {} };
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const moduleFactory = new Function(
            'module',
            'exports',
            '__webpack_public_path__',
            'define',
            source
        );
        moduleFactory(
            _module,
            _module.exports,
            publicPath,
            (factory: any) =>
                (_module.exports = typeof factory === 'function' ? factory() : factory)
        );
        return _module.exports;
    }

    getChunksModulesNames() {
        const compilation = this.stats!.compilation;
        const chunkByName: Record<string, string[]> = {};
        compilation.chunks.forEach((chunk) => {
            const names = [];
            const modules = compilation.chunkGraph.getChunkModulesIterableBySourceType(
                chunk,
                'javascript'
            );
            if (modules) {
                for (const module of modules) {
                    names.push(module.identifier().split(/[\\/]/).slice(-2).join('/'));
                }
            }
            chunkByName[chunk.name] = names;
        });
        return chunkByName;
    }

    public async closeAllPages() {
        for (const page of this.pages) {
            await page.close();
        }
        this.pages.length = 0;
    }

    public async destroy() {
        this.log(`Start Destroy Process`);

        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.log(`Browser closed`);
        }
        if (this.server) {
            this.server.close();
            this.server = null;
            this.log(`Server closed`);
        }
        if (this.watchingHandle) {
            await new Promise<void>((res) => this.watchingHandle?.close(() => res()));
            this.watchingHandle = null;
            this.log(`Watch closed`);
        }
        if (this.compiler) {
            await new Promise((res) => {
                this.compiler!.close(res);
                this.compiler = null;
            });
            this.log(`Compiler closed`);
        }
        await rimraf(this.outputDir);
        this.log(`Finished Destroy`);
    }

    private getWebpackConfig() {
        const webpackConfig = this.webpackConfig;
        if (webpackConfig.output && webpackConfig.output.path) {
            throw new Error('Test project should not specify output.path option');
        } else {
            webpackConfig.output = {
                ...webpackConfig.output,
                path: this.outputDir,
            };
        }
        return webpackConfig;
    }
}
