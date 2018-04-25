const { Stylable } = require("stylable");
const { ReplaceSource, OriginalSource } = require("webpack-sources");
const { StylableImportDependency } = require("./StylableDependencies");
const { getCSSDepthAndDeps } = require("./utils");
const {
  RENDERER_SYMBOL,
  STYLESHEET_SYMBOL
} = require("./runtime-dependencies");
const { replaceUrls } = require("./utils");

class StylableGenerator {
  constructor(stylable, compilation, options) {
    this.stylable = stylable;
    this.compilation = compilation;
    this.options = options;
  }
  transform(module) {
    const optimize = module.buildInfo.optimize;
    const trans = this.stylable.createTransformer({ optimize });
    if (optimize) {
      new Optimizer(this.stylable).cleanUnused(
        module.buildInfo.stylableMeta,
        module.buildInfo.usedStylableModules
      );
    }
    return trans.transform(module.buildInfo.stylableMeta);
  }
  toCSS(module, onAsset) {
    const { meta } = this.transform(module);
    return this.getCSSInJSWithAssets(meta.outputAst, onAsset);
  }
  generate(module, dependencyTemplates, runtimeTemplate) {
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

class Optimizer {
  constructor(stylable) {
    this.stylable = stylable;
  }
  cleanUnused(meta, usedPaths) {
    const transformer = this.stylable.createTransformer();

    meta.ast.walkRules(rule => {
      const outputSelectors = rule.selectors.filter(selector => {
        return this.isInUse(transformer, meta, selector, usedPaths);
      });
      if (outputSelectors.length) {
        rule.selector = outputSelectors.join();
      } else {
        rule.remove();
      }
    });
  }
  isInUse(transformer, meta, selector, usedPaths) {
    const selectorElements = transformer.resolveSelectorElements(
      meta,
      selector
    );

    // We expect to receive only one selectors at a time
    return selectorElements[0].every(res => {
      const lastChunk = res.resolved[res.resolved.length - 1];
      if (lastChunk) {
        const source = this.stylable.resolvePath(
          undefined,
          lastChunk.meta.source
        );
        return usedPaths.indexOf(source) !== -1;
      }
      return true;
    });
  }
}
