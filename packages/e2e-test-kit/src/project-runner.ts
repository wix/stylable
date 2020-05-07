import { spawn } from 'child_process';
import { join, normalize } from 'path';
import puppeteer from 'puppeteer';
import rimrafCallback from 'rimraf';
import { promisify } from 'util';
import webpack from 'webpack';
import { createTempDirectorySync } from 'create-temp-directory';
import { nodeFs } from '@file-services/node';
import { symlinkSync } from 'fs';
import { deferred } from 'promise-assist';

export interface Options {
    projectDir: string;
    port?: number;
    puppeteerOptions: puppeteer.LaunchOptions;
    webpackOptions?: webpack.Configuration;
    throwOnBuildError?: boolean;
    configName?: string;
}

type MochaHook = import('mocha').HookFunction;
const rimraf = promisify(rimrafCallback);

export class ProjectRunner {
    public static mochaSetup(
        runnerOptions: Options,
        before: MochaHook,
        afterEach: MochaHook,
        after: MochaHook,
        watch = false
    ) {
        const disposeAfterEach: Set<() => void> = new Set();
        if (watch) {
            const projectToCopy = runnerOptions.projectDir;
            const tempDir = createTempDirectorySync('local-test');
            tempDir.path = nodeFs.realpathSync(tempDir.path);
            const projectPath = join(tempDir.path, 'project');
            disposeAfterEach.add(tempDir.remove);
            nodeFs.copyDirectorySync(projectToCopy, projectPath);
            symlinkSync(
                join(__dirname, '../../../node_modules'),
                join(tempDir.path, 'node_modules'),
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
    public puppeteerOptions: puppeteer.LaunchOptions;
    public pages: puppeteer.Page[];
    public stats: webpack.Stats | null;
    public throwOnBuildError: boolean;
    public serverUrl: string;
    public server!: { close(): void } | null;
    public browser!: puppeteer.Browser | null;
    public compiler!: webpack.Compiler | null;
    public watchingHandle!: webpack.Watching | null;
    constructor({
        projectDir,
        port = 3000,
        puppeteerOptions = {},
        throwOnBuildError = true,
        webpackOptions,
        configName = 'webpack.config',
    }: Options) {
        this.projectDir = projectDir;
        this.outputDir = join(this.projectDir, 'dist');
        this.webpackConfig = this.loadTestConfig(configName, webpackOptions);
        this.port = port;
        this.serverUrl = `http://localhost:${this.port}`;
        this.puppeteerOptions = { ...puppeteerOptions, pipe: true };
        this.pages = [];
        this.stats = null;
        this.throwOnBuildError = throwOnBuildError;
    }
    public loadTestConfig(configName?: string, webpackOptions: webpack.Configuration = {}) {
        return {
            ...require(join(this.projectDir, configName || 'webpack.config')),
            ...webpackOptions,
        };
    }
    public async bundle() {
        const webpackConfig = this.getWebpackConfig();
        const compiler = webpack(webpackConfig);
        this.compiler = compiler;
        compiler.run = compiler.run.bind(compiler);
        const promisedRun = promisify(compiler.run);
        this.stats = await promisedRun();
        if (this.throwOnBuildError && this.stats.hasErrors()) {
            throw new Error(this.stats.toString({ colors: true }));
        }
    }
    public async watch() {
        const webpackConfig = this.getWebpackConfig();
        const compiler = webpack(webpackConfig);
        this.compiler = compiler;

        const firstCompile = deferred<webpack.Stats>();

        this.watchingHandle = compiler.watch({}, (err, stats) => {
            if (!this.stats) {
                if (this.throwOnBuildError && stats.compilation.errors.length) {
                    err = new Error(stats.compilation.errors.join('\n'));
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
    }

    public async serve() {
        return new Promise((res) => {
            const child = spawn(
                'node',
                [
                    '-r',
                    '@ts-tools/node/r',
                    './isolated-server',
                    this.outputDir,
                    this.port.toString(),
                ],
                {
                    cwd: __dirname,
                    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
                }
            );
            child.once('message', (port) => {
                this.serverUrl = `http://localhost:${port}`;
                this.server = {
                    close() {
                        child.kill();
                    },
                };
                res();
            });
        });
    }

    public async openInBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch(this.puppeteerOptions);
        }
        const page = await this.browser.newPage();
        this.pages.push(page);

        await page.setCacheEnabled(false);
        const responses: puppeteer.Response[] = [];
        page.on('response', (response) => {
            responses.push(response);
        });
        await page.goto(this.serverUrl, { waitUntil: 'networkidle0' });
        return { page, responses };
    }

    public getBuildWarningMessages() {
        return this.stats!.compilation.warnings.slice();
    }

    public getBuildErrorMessages() {
        return this.stats!.compilation.errors.slice();
    }

    public getBuildAsset(assetPath: string) {
        return this.getBuildAssets()[normalize(assetPath)].source();
    }

    public getBuildAssets() {
        return this.stats!.compilation.assets;
    }

    public evalAssetModule(source: string, publicPath = ''): any {
        const _module = { exports: {} };
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

    public async closeAllPages() {
        for (const page of this.pages) {
            await page.close();
        }
        this.pages.length = 0;
    }

    public async destroy() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
        if (this.server) {
            this.server.close();
            this.server = null;
        }
        if (this.compiler) {
            this.compiler = null;
        }
        if (this.watchingHandle) {
            await new Promise((res) => this.watchingHandle?.close(res));
            this.watchingHandle = null;
        }
        await rimraf(this.outputDir);
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
