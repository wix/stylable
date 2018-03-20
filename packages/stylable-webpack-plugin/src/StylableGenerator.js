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
  toCSS(module, onAsset) {
    const { meta, exports } = this.stylable.transform(
      module.buildInfo.stylableMeta
    );
    return this.getCSSInJSWithAssets(meta.outputAst, onAsset);
  }
  generate(module, dependencyTemplates, runtimeTemplate) {
    const { meta, exports } = this.stylable.transform(
      module.buildInfo.stylableMeta
    );

    const isImportedByNonStylable = module.buildInfo.isImportedByNonStylable;
    const imports = this.generateImports(module, runtimeTemplate);

    const depth = module.buildInfo.runtimeInfo.depth;
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
        node.stringType = "";
        delete node.innerSpacingBefore;
        delete node.innerSpacingAfter;
        node.url = `__css_asset_placeholder__${replacements.length - 1}__`;
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
}

module.exports = StylableGenerator;
