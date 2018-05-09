const { StylableOptimizer } = require("stylable");
const { StylableClassNameOptimizer } = require("./classname-optimizer");
const { ReplaceSource, OriginalSource } = require("webpack-sources");
const { StylableImportDependency } = require("./StylableDependencies");
const {
  RENDERER_SYMBOL,
  STYLESHEET_SYMBOL
} = require("./runtime-dependencies");
const { replaceUrls } = require("./utils");

const optimizer = new StylableOptimizer();
const classNameOptimizer = new StylableClassNameOptimizer();

class StylableGenerator {
  constructor(stylable, compilation, options) {
    this.stylable = stylable;
    this.compilation = compilation;
    this.options = options;
    this.optimizer = optimizer;
  }
  generate(module, dependencyTemplates, runtimeTemplate) {
    if (module.type === 'stylable-raw') {
      return module.originalSource();
    }
    const { meta, exports } = this.transform(module);
    const isImportedByNonStylable = module.buildInfo.isImportedByNonStylable;
    const imports = this.generateImports(module, runtimeTemplate);

    const css = this.options.includeCSSInJS
      ? this.getCSSInJSWithAssets(
          meta.outputAst,
          module =>
            `" + __webpack_require__(${runtimeTemplate.moduleId({
              module,
              request: module.request
            })}) + "`,
          true
        )
      : `""`;

    this.reportDiagnostics(meta);

    const depth = module.buildInfo.runtimeInfo.depth;
    const id = runtimeTemplate.moduleId({
      module,
      request: module.request
    });

    const originalSource = isImportedByNonStylable
      ? this.createModuleSource(module, imports, "create", [
          JSON.stringify(meta.root),
          JSON.stringify(meta.namespace),
          JSON.stringify(exports),
          css,
          depth,
          id
        ])
      : this.createModuleSource(module, imports, "createTheme", [
          css,
          depth,
          id
        ]);
    return new ReplaceSource(originalSource);
  }
  transform(module) {
    const {
      removeUnusedComponents,
      removeComments,
      removeStylableDirectives,
      classNameOptimizations
    } = module.buildInfo.optimize;

    if (removeUnusedComponents) {
      optimizer.removeUnusedComponents(
        this.stylable,
        module.buildInfo.stylableMeta,
        module.buildInfo.usedStylableModules
      );
    }
    const results = this.stylable
      .createTransformer()
      .transform(module.buildInfo.stylableMeta);

    if (removeComments) {
      this.optimizer.removeComments(results.meta.outputAst);
    }
    if (removeStylableDirectives) {
      this.optimizer.removeStylableDirectives(results.meta.outputAst);
    }
    if (classNameOptimizations) {
      classNameOptimizer.optimizeAstAndExports(
        results.meta.outputAst,
        results.exports,
        Object.keys(results.meta.classes)
      );
    }

    return results;
  }
  toCSS(module, onAsset) {
    const { meta } = this.transform(module);
    return this.getCSSInJSWithAssets(meta.outputAst, onAsset);
  }
  reportDiagnostics(meta) {
    const transformReports = meta.transformDiagnostics
      ? meta.transformDiagnostics.reports
      : [];
    meta.diagnostics.reports.concat(transformReports).forEach(report => {
      if (report.node) {
        this.compilation.warnings.push(
          report.node
            .error(report.message, report.options)
            .toString()
            .replace("CssSyntaxError", "Stylable")
        );
      } else {
        this.compilation.warnings.push(report.message);
      }
    });
  }
  createModuleSource(module, imports, createMethod, args) {
    return new OriginalSource(
      [
        `Object.defineProperty(${
          module.exportsArgument
        }, "__esModule", { value: true })`,
        imports.join("\n"),
        `${
          module.exportsArgument
        }.default = ${STYLESHEET_SYMBOL}.${createMethod}(`,
        args.map(_ => "  " + _).join(",\n"),
        `);`,
        this.options.includeCSSInJS
          ? `${RENDERER_SYMBOL}.register(${module.exportsArgument}.default)`
          : ""
      ].join("\n"),
      module.resource
    );
  }
  generateImports(module, runtimeTemplate) {
    const imports = [];
    for (const dependency of module.dependencies) {
      if (dependency instanceof StylableImportDependency) {
        if (
          dependency.defaultImport === STYLESHEET_SYMBOL ||
          dependency.defaultImport === RENDERER_SYMBOL
        ) {
          const id = runtimeTemplate.moduleId({
            module: dependency.module,
            request: dependency.request
          });
          imports.push(
            `var ${dependency.defaultImport} = __webpack_require__(${id});`
          );
        }
      }
    }
    return imports;
  }
  getCSSInJSWithAssets(outputAst, onAsset, asJS = false) {
    const replacements = [];

    replaceUrls(outputAst, node => {
      const resourcePath = node.url;
      const module = this.compilation.modules.filter(
        _ => _.resource === resourcePath
      )[0];
      if (module) {
        replacements.push(module);
        this.rewriteUrl(node, replacements.length - 1);
      } else {
        //TODO: warn
      }
    });

    const css = asJS
      ? JSON.stringify(outputAst.toString())
      : outputAst.toString();

    return css.replace(/__css_asset_placeholder__(.*?)__/g, ($0, $1) => {
      return onAsset(replacements[$1]); //`" + __webpack_require__(${replacements[$1]}) + "`;
    });
  }
  rewriteUrl(node, replacementIndex) {
    node.stringType = "";
    delete node.innerSpacingBefore;
    delete node.innerSpacingAfter;
    node.url = `__css_asset_placeholder__${replacementIndex}__`;
  }
}

module.exports = StylableGenerator;
