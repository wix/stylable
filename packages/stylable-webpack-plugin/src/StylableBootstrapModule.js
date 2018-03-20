const Module = require("webpack/lib/Module");
const RawSource = require("webpack-sources").RawSource;
const { StylableImportDependency } = require("./StylableDependencies");
const {
  RENDERER_SYMBOL,
  STYLESHEET_SYMBOL
} = require("./runtime-dependencies");

class StylableBootstrapModule extends Module {
  constructor(
    context,
    runtimeRenderer,
    dependencies = [],
    name = "stylable-runtime-module",
    type = "stylable-runtime"
  ) {
    super("javascript/auto", context);

    // from plugin
    this.runtimeRenderer = runtimeRenderer;
    this.dependencies = dependencies;
    this.name = name;
    this.type = type;
    this.built = true;
    this.hash = '';
    this.buildMeta = {};
    this.buildInfo = {};
    this.usedExports = [];
  }

  identifier() {
    return `stylable-runtime ${this.name}`;
  }

  readableIdentifier() {
    return this.identifier();
  }

  build(options, compilation, resolver, fs, callback) {
    return callback();
  }

  source(m, runtimeTemplate) {
    const imports = this.dependencies.map(dependency => {
      const id = runtimeTemplate.moduleId({
        module: dependency.module,
        request: dependency.request
      });
      return `__webpack_require__(${id});`;
    });

    let renderingCode = [];
    if (this.runtimeRenderer) {
      const id = runtimeTemplate.moduleId({
        module: this.runtimeRenderer,
        request: this.runtimeRenderer.request
      });
      renderingCode.push(
        `var ${RENDERER_SYMBOL} = __webpack_require__(${id});`
      );
      renderingCode.push(...imports);
      renderingCode.push(`${RENDERER_SYMBOL}.init(window);`);
      renderingCode.push(`window.__stylable$renderer = ${RENDERER_SYMBOL}`);
      this.__source = new RawSource(renderingCode.join("\n"));
    } else {
      this.__source = new RawSource(imports.join("\n"));
    }

    return this.__source;
  }

  needRebuild() {
    return false;
  }

  size() {
    return this.__source ? this.__source.size() : 1;
  }
  updateHash(hash) {
    hash.update("stylable module");
    hash.update(this.name || "");
    super.updateHash(hash || "");
  }
  addStylableModuleDependency(module) {
    const dep = new StylableImportDependency(module.request, {
      defaultImport: `style_${this.dependencies.length}`,
      names: []
    });
    dep.module = module;
    this.dependencies.push(dep);
  }
}

module.exports.StylableBootstrapModule = StylableBootstrapModule;
