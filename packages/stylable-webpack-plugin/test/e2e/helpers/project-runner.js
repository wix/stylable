const { join } = require("path");
const { promisify } = require("util");
const webpack = require("webpack");
const express = require("express");
const puppeteer = require("puppeteer");
// const { bundleAndServe } = require("./helpers/bundle-and-serve");
const rimrafCallback = require("rimraf");
const rimraf = promisify(rimrafCallback);

class ProjectRunner {
  constructor({
    projectDir,
    port = 3000,
    puppeteerOptions = {},
    throwOnBuildError = true
  }) {
    this.projectDir = projectDir;
    this.outputDir = join(this.projectDir, "dist");
    this.webpackConfig = this.loadTestConfig();
    this.port = port;
    this.serverUrl = `http://localhost:${this.port}`;
    this.puppeteerOptions = puppeteerOptions;
    this.pages = [];
    this.stats = null;
    this.throwOnBuildError = throwOnBuildError;
  }
  loadTestConfig() {
    return require(join(this.projectDir, "webpack.config.js"));
  }
  async bundle() {
    const webpackConfig = this.webpackConfig;
    if (webpackConfig.output && webpackConfig.output.path) {
      throw new Error("Test project should not specify output.path option");
    } else {
      webpackConfig.output = {
        ...webpackConfig.output,
        path: this.outputDir
      };
    }
    const compiler = webpack(webpackConfig);
    compiler.run = promisify(compiler.run);
    this.stats = await compiler.run();
    if (this.throwOnBuildError && this.stats.compilation.errors.length) {
      throw new Error(this.stats.compilation.errors);
    }
  }

  async serve() {
    if (this.server) {
      throw new Error("project server is already running in port " + this.port);
    }
    const app = express();
    app.use(
      express.static(this.outputDir, { cacheControl: false, etag: false })
    );
    return new Promise((res, rej) => {
      this.server = app.listen(this.port, err => {
        if (err) {
          return rej(err);
        }
        res();
      });
      this.server.close = promisify(this.server.close);
    });
  }

  async openInBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch(this.puppeteerOptions);
    }
    const page = await this.browser.newPage();
    this.pages.push(page);

    await page.setCacheEnabled(false);
    const responses = [];
    page.on("response", response => {
      responses.push(response);
    });
    await page.goto(this.serverUrl, { waitUntil: "networkidle0" });
    return { page, responses };
  }

  getBuildWarningMessages() {
    return this.stats.compilation.warnings.slice();
  }

  async closeAllPages() {
    for (const page of this.pages) {
      await page.close();
    }
    this.pages.length = 0;
  }

  async destroy() {
    this.browser && (await this.browser.close());
    this.browser = null;
    this.server && (await this.server.close());
    this.server = null;
    await rimraf(this.outputDir);
  }
  static mochaSetup(runnerOptions, before, afterEach, after) {
    const projectRunner = new this(runnerOptions);

    before("bundle and serve project", async () => {
      await projectRunner.bundle();
      await projectRunner.serve();
    });

    afterEach("cleanup open pages", async () => {
      await projectRunner.closeAllPages();
    });

    after("destroy runner", async () => {
      await projectRunner.destroy();
    });

    return projectRunner;
  }
}

class StylableProjectRunner extends ProjectRunner {
  loadTestConfig() {
    const config = super.loadTestConfig();
    if (config.plugins) {
      const plugin = config.plugins.find(
        p => p.constructor.name === "StylableWebpackPlugin"
      );
      if (plugin) {
        plugin.options.optimize.shortNamespaces = true;
      }
    }
    return config;
  }
}

exports.ProjectRunner = StylableProjectRunner;
